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

interface OddsApiError {
  message: string;
  details?: any;
  timestamp: string;
}

function handleError(error: unknown): OddsApiError {
  console.error('Error details:', {
    error,
    type: error instanceof Error ? 'Error' : typeof error,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });

  return {
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    details: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  };
}

function getSeasonStartDate(year: number): Date {
  try {
    let date = new Date(year, 8, 1); // September 1st
    while (date.getDay() !== 4) { // 4 = Thursday
      date.setDate(date.getDate() + 1);
    }
    return date;
  } catch (error) {
    console.error('Error in getSeasonStartDate:', error);
    throw new Error('Failed to calculate season start date');
  }
}

function getCurrentWeekNumber(): string {
  try {
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
  } catch (error) {
    console.error('Error in getCurrentWeekNumber:', error);
    throw new Error('Failed to calculate current week');
  }
}

function getWeekFromDate(gameDate: Date): string {
  try {
    const gameYear = gameDate.getFullYear();
    let seasonStart = getSeasonStartDate(gameYear);
    
    if (gameDate.getMonth() < 8) {
      seasonStart.setFullYear(gameYear - 1);
    }
    
    const diffTime = gameDate.getTime() - seasonStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;

    return Math.min(Math.max(weekNumber, 1), 18).toString();
  } catch (error) {
    console.error('Error in getWeekFromDate:', error);
    throw new Error('Failed to calculate game week');
  }
}

async function fetchOddsData(): Promise<Game[]> {
  console.log('Starting fetchOddsData...');
  
  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    console.error('ODDS_API_KEY not found in environment variables');
    throw new Error('API key not configured');
  }

  try {
    const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
    const fullUrl = `${ODDS_API_URL}?apiKey=${API_KEY}&regions=us&markets=spreads`;
    
    console.log('Making API request to:', ODDS_API_URL);
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Invalid API response format:', typeof data);
      throw new Error('Invalid API response format');
    }

    console.log('API data received:', {
      count: data.length,
      firstGame: data[0] ? `${data[0].away_team} vs ${data[0].home_team}` : 'No games'
    });

    return processGames(data);
  } catch (error) {
    console.error('Error in fetchOddsData:', error);
    throw error;
  }
}

function processGames(data: any[]): Game[] {
  try {
    console.log('Processing games data, count:', data.length);
    
    return data
      .filter(game => {
        const isValid = game && game.sport_key === 'americanfootball_nfl';
        if (!isValid) {
          console.log('Filtered out game:', game?.sport_key);
        }
        return isValid;
      })
      .map((game, index) => {
        const spread = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
        const homeOutcome = spread?.outcomes?.find((o: any) => o.name === game.home_team);
        const line = homeOutcome?.point || 0;
        
        const gameDate = new Date(game.commence_time);
        const weekNum = getWeekFromDate(gameDate);
        
        console.log(`Processed game ${index + 1}:`, {
          teams: `${game.away_team} @ ${game.home_team}`,
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
  } catch (error) {
    console.error('Error processing games:', error);
    throw new Error('Failed to process games data');
  }
}

function generateWeeks(games: Game[]): WeekInfo[] {
  try {
    console.log('Generating weeks from games:', games.length);
    
    const currentWeek = getCurrentWeekNumber();
    const weeksWithGames = [...new Set(games.map(g => g.weekNumber))];
    
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
  } catch (error) {
    console.error('Error generating weeks:', error);
    throw new Error('Failed to generate weeks');
  }
}

export async function GET() {
  console.log('Starting GET request handler');
  
  try {
    // Step 1: Fetch games data
    console.log('Fetching odds data...');
    const games = await fetchOddsData();
    console.log('Games fetched successfully:', games.length);

    // Step 2: Generate weeks
    console.log('Generating weeks...');
    const weeks = generateWeeks(games);
    console.log('Weeks generated:', weeks.length);

    // Step 3: Get current week
    console.log('Getting current week...');
    const currentWeek = getCurrentWeekNumber();
    console.log('Current week:', currentWeek);

    // Step 4: Prepare response
    console.log('Preparing response...');
    const response: WeekResponse = {
      games,
      weeks,
      currentWeek
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorDetails = handleError(error);
    
    console.error('Error in GET handler:', errorDetails);
    
    return NextResponse.json({ 
      error: errorDetails.message,
      details: errorDetails.details,
      timestamp: errorDetails.timestamp,
      games: [],
      weeks: [],
      currentWeek: getCurrentWeekNumber()
    }, { 
      status: 500 
    });
  }
}
