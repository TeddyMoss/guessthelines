import { NextResponse } from 'next/server';

interface Game {
  id: string;
  weekNumber: string;
  away_team: string;
  home_team: string;
  commence_time: string;
  vegas_line: number;
  favorite: string;
}

interface WeekInfo {
  number: string;
  startDate: string;
  available: boolean;
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
  
  // Determine which NFL season we're in
  // NFL season runs Sept-Feb, so Jan-Aug = previous season
  const seasonYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
  const seasonStart = getSeasonStartDate(seasonYear);
  
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  console.log('Week calculation:', {
    currentDate: now.toISOString(),
    seasonYear,
    seasonStart: seasonStart.toISOString(),
    calculatedWeek: weekNumber
  });
  
  return Math.min(Math.max(weekNumber, 1), 22).toString(); // Increased max for playoffs
}

async function fetchOddsData(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;
  
  if (!API_KEY) {
    console.error('Missing ODDS_API_KEY in environment');
    throw new Error('API configuration error');
  }

  const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
  const params = new URLSearchParams({
    apiKey: API_KEY,
    regions: 'us',
    markets: 'spreads',
    dateFormat: 'iso'
  });

  let response;
  try {
    response = await fetch(`${ODDS_API_URL}?${params}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }
    });
  } catch (error) {
    console.error('Network error fetching odds:', error);
    throw new Error('Network error fetching odds data');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Odds API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      headers: Object.fromEntries(response.headers.entries())
    });
    throw new Error(`Odds API error: ${response.status}`);
  }

  const data = await response.json();
  
  console.log('Raw API response:', {
    totalGames: data.length,
    dateRange: data.length ? {
      earliest: new Date(Math.min(...data.map(g => new Date(g.commence_time).getTime()))).toISOString(),
      latest: new Date(Math.max(...data.map(g => new Date(g.commence_time).getTime()))).toISOString()
    } : null
  });

  return data
    .filter(game => game.sport_key === 'americanfootball_nfl')
    .map(game => {
      const fanduel = game.bookmakers?.find(b => b.key === 'fanduel');
      if (!fanduel) return null;

      const spread = fanduel.markets?.find(m => m.key === 'spreads');
      const homeOutcome = spread?.outcomes?.find(o => o.name === game.home_team);
      const awayOutcome = spread?.outcomes?.find(o => o.name === game.away_team);

      if (!spread || !homeOutcome || !awayOutcome) return null;

      const line = homeOutcome.point;
      const favorite = homeOutcome.point < 0 ? game.home_team : game.away_team;

      const gameDate = new Date(game.commence_time);
      // Use same logic for determining season year
      const gameSeasonYear = gameDate.getMonth() < 8 ? gameDate.getFullYear() - 1 : gameDate.getFullYear();
      const yearStart = getSeasonStartDate(gameSeasonYear);

      const diffTime = gameDate.getTime() - yearStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const gameWeek = Math.floor(diffDays / 7) + 1;

      return {
        id: game.id,
        weekNumber: Math.min(Math.max(gameWeek, 1), 22).toString(),
        away_team: game.away_team,
        home_team: game.home_team,
        commence_time: game.commence_time,
        vegas_line: line,
        favorite
      };
    })
    .filter((game): game is Game => game !== null)
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());
}

function generateWeeks(games: Game[]): WeekInfo[] {
  const currentWeek = parseInt(getCurrentWeekNumber());
  const weeksWithGames = [...new Set(games.map(g => parseInt(g.weekNumber)))];
  
  console.log('Week generation:', {
    currentWeek,
    weeksWithGames,
    gamesCount: games.length
  });

  const weeksList = [currentWeek, currentWeek + 1]
    .filter(w => w <= 22)
    .sort((a, b) => a - b);

  return weeksList.map(weekNum => {
    const now = new Date();
    const seasonYear = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
    const seasonStart = getSeasonStartDate(seasonYear);
    const weekStart = new Date(seasonStart);
    weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
    
    return {
      number: weekNum.toString(),
      startDate: weekStart.toISOString(),
      available: weeksWithGames.includes(weekNum)
    };
  });
}

export async function GET() {
  console.log('Starting /api/odds request');
  
  try {
    const games = await fetchOddsData();
    const weeks = generateWeeks(games);
    const currentWeek = getCurrentWeekNumber();

    console.log('Final response:', {
      totalGames: games.length,
      currentWeek,
      availableWeeks: weeks.map(w => w.number)
    });

    return NextResponse.json({
      games,
      weeks,
      currentWeek
    });
  } catch (error: any) {
    console.error('Error in odds API:', {
      message: error?.message,
      stack: error?.stack
    });
    
    return NextResponse.json({
      error: 'Unable to fetch game data. Please try again later.',
      details: error?.message
    }, { 
      status: 503 
    });
  }
}