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

async function fetchOddsData(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    // Calculate date range
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    
    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(now.getDate() + 14);

    // Format dates for API
    const dateFrom = threeDaysAgo.toISOString().split('T')[0];
    const dateTo = twoWeeksFromNow.toISOString().split('T')[0];

    const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
    const params = new URLSearchParams({
      apiKey: API_KEY,
      regions: 'us',
      markets: 'spreads',
      dateFormat: 'iso',
      commenceTimeFrom: `${dateFrom}T00:00:00Z`,
      commenceTimeTo: `${dateTo}T23:59:59Z`
    });

    console.log('Fetching games with date range:', {
      from: dateFrom,
      to: dateTo,
      url: `${ODDS_API_URL}?${params.toString().replace(API_KEY, 'HIDDEN')}`
    });

    const response = await fetch(`${ODDS_API_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    console.log('Raw API response:', {
      totalGames: data.length,
      dateRange: {
        earliest: data.length ? new Date(Math.min(...data.map(g => new Date(g.commence_time).getTime()))).toISOString() : null,
        latest: data.length ? new Date(Math.max(...data.map(g => new Date(g.commence_time).getTime()))).toISOString() : null
      },
      games: data.map(g => ({
        teams: `${g.away_team} @ ${g.home_team}`,
        date: g.commence_time,
        bookmakers: g.bookmakers?.length
      }))
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

    // Log processed games by week
    const gamesByWeek = processedGames.reduce((acc, game) => {
      if (!acc[game.weekNumber]) {
        acc[game.weekNumber] = [];
      }
      acc[game.weekNumber].push(game);
      return acc;
    }, {} as Record<string, Game[]>);

    console.log('Processed games by week:', Object.entries(gamesByWeek).map(([week, games]) => ({
      week,
      count: games.length,
      games: games.map(g => `${g.away_team} @ ${g.home_team}`)
    })));

    return processedGames.sort((a, b) => 
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    );
  } catch (error) {
    console.error('Error in fetchOddsData:', error);
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

  // Always include current week and next week
  const weeksList = [currentWeek, currentWeek + 1]
    .filter(w => w <= 18)
    .sort((a, b) => a - b);

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
    const games = await fetchOddsData();
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