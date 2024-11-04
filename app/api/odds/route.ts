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
  error?: string;
}

function getSeasonStartDate(year: number): Date {
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
  
  if (now.getMonth() < 8) {
    seasonStart.setFullYear(currentYear - 1);
  }
  
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  return Math.min(Math.max(weekNumber, 1), 18).toString();
}

async function fetchOddsData(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;
  
  if (!API_KEY) {
    console.error('ODDS_API_KEY not found');
    throw new Error('API key not configured');
  }

  const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
  const fullUrl = `${ODDS_API_URL}?apiKey=${API_KEY}&regions=us&markets=spreads`;
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Odds API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Odds API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Odds API Response:', {
      gamesCount: data.length,
      firstGame: data[0] ? `${data[0].away_team} vs ${data[0].home_team}` : 'No games'
    });

    return data
      .filter(game => game.sport_key === 'americanfootball_nfl')
      .map(game => {
        const spread = game.bookmakers?.[0]?.markets?.find(m => m.key === 'spreads');
        const homeOutcome = spread?.outcomes?.find(o => o.name === game.home_team);
        const line = homeOutcome?.point || 0;
        
        return {
          id: game.id,
          weekNumber: getCurrentWeekNumber(), // Use current week
          away_team: game.away_team,
          home_team: game.home_team,
          commence_time: game.commence_time,
          vegas_line: line
        };
      })
      .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());
  } catch (error) {
    console.error('Error in fetchOddsData:', error);
    throw error;
  }
}

function generateWeeks(games: Game[]): WeekInfo[] {
  const currentWeek = getCurrentWeekNumber();
  const allWeeks = Array.from({ length: 18 }, (_, i) => (i + 1).toString());
  
  return allWeeks.map(weekNum => {
    const seasonStart = getSeasonStartDate(new Date().getFullYear());
    const weekStart = new Date(seasonStart);
    weekStart.setDate(weekStart.getDate() + (parseInt(weekNum) - 1) * 7);
    
    return {
      number: weekNum,
      startDate: weekStart.toISOString(),
      available: parseInt(weekNum) >= parseInt(currentWeek)
    };
  });
}

export async function GET() {
  console.log('Starting /api/odds request');
  
  try {
    const games = await fetchOddsData();
    const weeks = generateWeeks(games);
    const currentWeek = getCurrentWeekNumber();

    console.log('API Response prepared:', {
      gamesCount: games.length,
      weeksCount: weeks.length,
      currentWeek
    });

    return NextResponse.json({
      games,
      weeks,
      currentWeek
    });
  } catch (error) {
    console.error('Error in GET handler:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return a more graceful error response
    return NextResponse.json({
      games: [],
      weeks: generateWeeks([]), // Still return week structure
      currentWeek: getCurrentWeekNumber(),
      error: 'Unable to fetch game data. Please try again later.'
    }, { 
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
}
