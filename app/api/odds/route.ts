import { NextResponse } from 'next/server';

interface Game {
  id: string;
  weekNumber: string;
  away_team: string;
  home_team: string;
  commence_time: string;
  vegas_line: number;
}

interface WeekInfo {
  number: string;
  startDate: string;
  available: boolean;
}

interface WeekResponse {
  games: Game[];
  weeks: WeekInfo[];
  currentWeek: string;
}

function getSeasonStartDate(year: number): Date {
  // Find first Thursday of September
  let date = new Date(year, 8, 1); // September 1st
  while (date.getDay() !== 4) { // 4 = Thursday
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function getCurrentWeekNumber(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const seasonStart = getSeasonStartDate(currentYear);
  
  // If before September, use previous year's start
  if (now.getMonth() < 8) { // Before September
    seasonStart.setFullYear(currentYear - 1);
  }
  
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  return Math.min(Math.max(weekNumber, 1), 18).toString();
}

function getWeekFromDate(gameDate: Date): string {
  const gameYear = gameDate.getFullYear();
  
  // Find season start date
  let seasonStart = getSeasonStartDate(gameYear);
  
  // Handle games in January-August being part of previous season
  if (gameDate.getMonth() < 8) { // Before September
    seasonStart.setFullYear(gameYear - 1);
  }
  
  const diffTime = gameDate.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  console.log('Week Calculation:', {
    gameDate: gameDate.toISOString(),
    seasonStart: seasonStart.toISOString(),
    diffDays,
    weekNumber
  });

  return Math.min(Math.max(weekNumber, 1), 18).toString();
}

async function fetchOddsData(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;

  if (!API_KEY) {
    console.error('API key not found');
    throw new Error('API configuration missing');
  }

  const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
  const fullUrl = `${ODDS_API_URL}?apiKey=${API_KEY}&regions=us&markets=spreads`;

  try {
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response format');
    }

    return processApiData(data);
  } catch (error) {
    console.error('Error fetching odds:', error);
    throw error;
  }
}

function processApiData(data: any[]): Game[] {
  console.log('Processing games:', data.length);
  
  return data
    .filter(game => game.sport_key === 'americanfootball_nfl')
    .map((game: any) => {
      const spread = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
      const homeOutcome = spread?.outcomes?.find(o => o.name === game.home_team);
      const line = homeOutcome?.point || 0;
      const gameDate = new Date(game.commence_time);
      const weekNum = getWeekFromDate(gameDate);
      
      console.log('Game processed:', {
        teams: `${game.away_team} @ ${game.home_team}`,
        date: game.commence_time,
        calculatedWeek: weekNum,
        line: line
      });

      return {
        id: game.id,
        weekNumber: weekNum,
        away_team: game.away_team,
        home_team: game.home_team,
        commence_time: game.commence_time,
        vegas_line: line
      };
    })
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());
}

function generateWeeks(games: Game[]): WeekInfo[] {
  const currentWeek = getCurrentWeekNumber();
  const weeksWithGames = [...new Set(games.map(g => g.weekNumber))];
  
  console.log('Generating weeks:', {
    currentWeek,
    weeksWithGames,
    gamesCount: games.length
  });

  return weeksWithGames
    .map(weekNum => {
      const seasonStart = getSeasonStartDate(new Date().getFullYear());
      const weekStart = new Date(seasonStart);
      weekStart.setDate(weekStart.getDate() + (parseInt(weekNum) - 1) * 7);
      
      return {
        number: weekNum,
        startDate: weekStart.toISOString(),
        available: parseInt(weekNum) >= parseInt(currentWeek)
      };
    })
    .sort((a, b) => parseInt(a.number) - parseInt(b.number));
}

export async function GET() {
  try {
    const games = await fetchOddsData();
    const weeks = generateWeeks(games);
    const currentWeek = getCurrentWeekNumber();

    console.log('Final response:', {
      totalGames: games.length,
      totalWeeks: weeks.length,
      currentWeek
    });

    const response: WeekResponse = {
      games,
      weeks,
      currentWeek
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ 
      error: 'Unable to fetch game data. Please try again later.',
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}