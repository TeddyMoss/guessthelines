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

interface BookmakerOutcome {
  name: string;
  point: number;
  price?: number;
}

interface BookmakerMarket {
  key: string;
  outcomes: BookmakerOutcome[];
}

interface Bookmaker {
  key: string;
  markets: BookmakerMarket[];
}

interface OddsResponse {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

function getSeasonStartDate(year: number): Date {
  console.log('Getting season start date for year:', year);
  // Find first Thursday of September
  let date = new Date(year, 8, 1); // September 1st
  while (date.getDay() !== 4) { // 4 = Thursday
    date.setDate(date.getDate() + 1);
  }
  console.log('Season start date calculated:', date.toISOString());
  return date;
}

function getCurrentWeekNumber(): string {
  const now = new Date();
  console.log('Calculating current week. Current date:', now.toISOString());
  
  const currentYear = now.getFullYear();
  const seasonStart = getSeasonStartDate(currentYear);
  
  // If before September, use previous year's start
  if (now.getMonth() < 8) {
    seasonStart.setFullYear(currentYear - 1);
    console.log('Adjusted to previous year. New season start:', seasonStart.toISOString());
  }
  
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  const adjustedWeek = Math.min(Math.max(weekNumber, 1), 18).toString();
  console.log('Current week calculated:', adjustedWeek);
  return adjustedWeek;
}

function getWeekFromDate(gameDate: Date): string {
  console.log('Calculating week for game date:', gameDate.toISOString());
  
  const gameYear = gameDate.getFullYear();
  let seasonStart = getSeasonStartDate(gameYear);
  
  if (gameDate.getMonth() < 8) {
    seasonStart.setFullYear(gameYear - 1);
    console.log('Adjusted season start for game date:', seasonStart.toISOString());
  }
  
  const diffTime = gameDate.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  const adjustedWeek = Math.min(Math.max(weekNumber, 1), 18).toString();
  console.log('Week calculated for game:', {
    gameDate: gameDate.toISOString(),
    weekNumber: adjustedWeek
  });
  return adjustedWeek;
}

async function fetchOddsData(): Promise<Game[]> {
  console.log('Starting odds data fetch...');
  const API_KEY = process.env.ODDS_API_KEY;

  if (!API_KEY) {
    console.error('API key not found in environment variables');
    throw new Error('API configuration missing');
  }

  const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
  const fullUrl = `${ODDS_API_URL}?apiKey=${API_KEY}&regions=us&markets=spreads`;
  
  try {
    console.log('Making API request to:', ODDS_API_URL);
    const response = await fetch(fullUrl);
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json() as OddsResponse[];
    console.log('API Response received, games count:', data.length);
    
    if (!Array.isArray(data)) {
      console.error('Invalid API response format:', typeof data);
      throw new Error('Invalid API response format');
    }

    return processApiData(data);
  } catch (error) {
    console.error('Error in fetchOddsData:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

function processApiData(data: OddsResponse[]): Game[] {
  console.log('Processing API data, total games:', data.length);
  
  return data
    .filter(game => {
      const isNFLGame = game.sport_key === 'americanfootball_nfl';
      if (!isNFLGame) {
        console.log('Filtering out non-NFL game:', game.sport_key);
      }
      return isNFLGame;
    })
    .map((game) => {
      console.log('Processing game:', `${game.away_team} @ ${game.home_team}`);
      
      const spread = game.bookmakers?.[0]?.markets.find(m => m.key === 'spreads');
      const homeOutcome = spread?.outcomes.find(o => o.name === game.home_team);
      const line = homeOutcome?.point || 0;
      
      const gameDate = new Date(game.commence_time);
      const weekNum = getWeekFromDate(gameDate);
      
      console.log('Game processed:', {
        teams: `${game.away_team} @ ${game.home_team}`,
        date: gameDate.toISOString(),
        week: weekNum,
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
  console.log('Generating weeks from games, total games:', games.length);
  
  const currentWeek = getCurrentWeekNumber();
  const weeksWithGames = [...new Set(games.map(g => g.weekNumber))];
  
  console.log('Weeks generation info:', {
    currentWeek,
    weeksWithGames,
    gamesCount: games.length
  });

  const weeks = weeksWithGames
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

  console.log('Generated weeks:', weeks.length);
  return weeks;
}

export async function GET() {
  console.log('Starting GET request handler...');
  
  try {
    const games = await fetchOddsData();
    console.log('Games fetched successfully:', games.length);
    
    const weeks = generateWeeks(games);
    const currentWeek = getCurrentWeekNumber();

    console.log('Preparing response:', {
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
    console.error('Error in GET handler:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json({ 
      error: 'Unable to fetch game data. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
}