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
  const seasonStart = getSeasonStartDate(currentYear);
  
  if (now.getMonth() < 8) {
    seasonStart.setFullYear(currentYear - 1);
  }
  
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  return Math.min(Math.max(weekNumber, 1), 18).toString();
}

async function fetchAvailableGames(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    // First, get all available NFL events
    const EVENTS_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events';
    const eventsParams = new URLSearchParams({
      apiKey: API_KEY,
      dateFormat: 'iso'
    });

    console.log('Fetching available events');
    
    const eventsResponse = await fetch(`${EVENTS_URL}?${eventsParams}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!eventsResponse.ok) {
      throw new Error(`Events API request failed: ${eventsResponse.status}`);
    }

    const events = await eventsResponse.json();
    
    console.log('Available events:', {
      count: events.length,
      dateRange: {
        earliest: events.length ? new Date(Math.min(...events.map(e => new Date(e.commence_time).getTime()))).toISOString() : null,
        latest: events.length ? new Date(Math.max(...events.map(e => new Date(e.commence_time).getTime()))).toISOString() : null
      }
    });

    // Then get odds for these events
    const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
    const oddsParams = new URLSearchParams({
      apiKey: API_KEY,
      regions: 'us',
      markets: 'spreads',
      dateFormat: 'iso'
    });

    const oddsResponse = await fetch(`${ODDS_API_URL}?${oddsParams}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!oddsResponse.ok) {
      throw new Error(`Odds API request failed: ${oddsResponse.status}`);
    }

    const data = await oddsResponse.json();

    console.log('Raw odds response:', {
      totalGames: data.length,
      dates: data.map(g => g.commence_time).sort()
    });

    const processedGames = data
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

        // Calculate week number
        const gameDate = new Date(game.commence_time);
        const yearStart = getSeasonStartDate(gameDate.getFullYear());
        if (gameDate.getMonth() < 8) {
          yearStart.setFullYear(yearStart.getFullYear() - 1);
        }
        const diffTime = gameDate.getTime() - yearStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const gameWeek = Math.floor(diffDays / 7) + 1;

        const processedGame = {
          id: game.id,
          weekNumber: Math.min(Math.max(gameWeek, 1), 18).toString(),
          away_team: game.away_team,
          home_team: game.home_team,
          commence_time: game.commence_time,
          vegas_line: line,
          favorite
        };

        return processedGame;
      })
      .filter((game): game is Game => game !== null);

    // Log weeks found
    const weeksCovered = [...new Set(processedGames.map(g => g.weekNumber))].sort();
    console.log('Weeks covered:', weeksCovered);

    return processedGames.sort((a, b) => 
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    );
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}

function generateWeeks(games: Game[]): WeekInfo[] {
  const currentWeek = parseInt(getCurrentWeekNumber());
  
  // Get all weeks that have games
  const weeksWithGames = [...new Set(games.map(g => parseInt(g.weekNumber)))];
  
  console.log('Week generation:', {
    currentWeek,
    weeksWithGames,
    gamesCount: games.length
  });

  // Get the highest week number from available games
  const maxWeek = Math.max(...weeksWithGames);
  const weeksList = Array.from(
    { length: maxWeek - currentWeek + 1 },
    (_, i) => currentWeek + i
  ).filter(w => w <= 18);

  return weeksList.map(weekNum => {
    const seasonStart = getSeasonStartDate(new Date().getFullYear());
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
    const games = await fetchAvailableGames();
    const weeks = generateWeeks(games);
    const currentWeek = getCurrentWeekNumber();

    console.log('API Response:', {
      totalGames: games.length,
      weeks: weeks.map(w => ({
        number: w.number,
        available: w.available,
        games: games.filter(g => g.weekNumber === w.number)
          .map(g => `${g.away_team} @ ${g.home_team}`)
      }))
    });

    return NextResponse.json({
      games,
      weeks,
      currentWeek
    });
  } catch (error: any) {
    console.error('Error in GET handler:', error);
    
    return NextResponse.json({
      games: [],
      weeks: generateWeeks([]),
      currentWeek: getCurrentWeekNumber(),
      error: 'Unable to fetch game data. Please try again later.'
    }, { 
      status: 500 
    });
  }
}