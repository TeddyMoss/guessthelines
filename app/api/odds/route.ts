import { NextResponse } from 'next/server';

interface Game {
  id: string;
  weekNumber: string;
  away_team: string;
  home_team: string;
  commence_time: string;
  vegas_line: number;
  type?: 'regular' | 'playoff';
  message?: string;
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

// Add interface for API response
interface OddsApiResponse {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point: number;
      }>;
    }>;
  }>;
}

function getCurrentWeekNumber(): string {
  return '8'; // We'll make this dynamic later
}

async function fetchOddsData(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;
  const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
  const fullUrl = `${ODDS_API_URL}?apiKey=${API_KEY}&regions=us&markets=spreads`;
  
  console.log('Starting API fetch...');

  try {
    const response = await fetch(fullUrl);
    console.log('API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json() as OddsApiResponse[];
    console.log('Raw API Response:', JSON.stringify(data, null, 2));

    if (!Array.isArray(data)) {
      console.error('Expected array response, got:', typeof data);
      throw new Error('Invalid API response format');
    }

    return data.map((game: OddsApiResponse, index: number) => {
      // Get the first bookmaker's spread market
      const spread = game.bookmakers?.[0]?.markets?.find(m => m.key === 'spreads');
      const spreadOutcome = spread?.outcomes?.find(o => o.name === game.home_team);
      const line = spreadOutcome?.point || 0;

      console.log('Processing game:', {
        id: game.id,
        home: game.home_team,
        away: game.away_team,
        line: line
      });

      return {
        id: game.id || `week8_${index}`,
        weekNumber: "8",  // We'll make this dynamic later
        away_team: game.away_team,
        home_team: game.home_team,
        commence_time: game.commence_time,
        vegas_line: line
      };
    });
  } catch (error) {
    console.error('Error fetching odds:', error);
    console.error('Stack trace:', (error as Error).stack);
    return [];
  }
}

function createMockData(): WeekResponse {
  const games: Game[] = [];
  const currentWeek = getCurrentWeekNumber();

  // Create week information
  const weeks: WeekInfo[] = [];
  for (let i = 1; i <= 18; i++) {
    weeks.push({
      number: i.toString(),
      startDate: new Date(2024, 8, i * 7).toISOString(),
      available: i <= parseInt(currentWeek)
    });
  }

  // Add playoff weeks
  ['WC', 'DIV', 'CONF', 'SB'].forEach((weekType, index) => {
    weeks.push({
      number: weekType,
      startDate: new Date(2025, 0, 7 + index * 7).toISOString(),
      available: false
    });
  });

  // Create mock games for current week
  const mockTeams = {
    week8: [
      { away: "Patriots", home: "Dolphins", line: -9.5 },
      { away: "Jets", home: "Giants", line: -3 },
      { away: "Jaguars", home: "Steelers", line: 2.5 },
      { away: "Falcons", home: "Titans", line: 2.5 },
      { away: "Saints", home: "Colts", line: -1 },
      { away: "Eagles", home: "Commanders", line: 6.5 },
      { away: "Texans", home: "Panthers", line: 3 },
      { away: "Rams", home: "Cowboys", line: -6.5 },
      { away: "Vikings", home: "Packers", line: 1 },
      { away: "Browns", home: "Seahawks", line: 3.5 },
      { away: "Chiefs", home: "Broncos", line: 7 },
      { away: "Bengals", home: "49ers", line: -4.5 },
      { away: "Bears", home: "Chargers", line: -8.5 },
      { away: "Raiders", home: "Lions", line: -8 }
    ]
  };

  mockTeams.week8.forEach((matchup, index) => {
    games.push({
      id: `week8_${index}`,
      weekNumber: "8",
      away_team: matchup.away,
      home_team: matchup.home,
      commence_time: new Date(2024, 9, 29 + Math.floor(index / 13)).toISOString(),
      vegas_line: matchup.line
    });
  });

  return {
    games,
    weeks,
    currentWeek
  };
}

export async function GET() {
  console.log('Starting GET request handler');
  
  try {
    let games = await fetchOddsData();
    console.log('Fetched games count:', games.length);

    if (games.length === 0) {
      console.log('No games from API, falling back to mock data');
      const mockData = createMockData();
      games = mockData.games;
    } else {
      console.log('Using real data from API');
    }

    const currentWeek = getCurrentWeekNumber();
    const weeks = createMockData().weeks;

    const response = {
      games,
      weeks,
      currentWeek
    };

    console.log('Sending response with games count:', response.games.length);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET handler:', error);
    // Fallback to mock data on error
    const mockData = createMockData();
    return NextResponse.json(mockData);
  }
}