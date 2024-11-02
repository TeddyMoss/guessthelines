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

function getCurrentWeekNumber(): string {
  return '8';
}

async function fetchOddsData(): Promise<Game[]> {
  const API_KEY = process.env.ODDS_API_KEY;
  console.log('Attempting to fetch with API Key:', API_KEY ? 'Key exists' : 'No key found');
  
  const ODDS_API_URL = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey=${API_KEY}&regions=us&markets=spreads`;
  console.log('Fetching from URL:', ODDS_API_URL);

  try {
    const response = await fetch(ODDS_API_URL);
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      console.error('API Response not ok:', await response.text());
      throw new Error('Failed to fetch odds');
    }
    
    const data = await response.json();
    console.log('Raw API data:', data);

    return data.map((game: any, index: number) => {
      // Find the spread market
      const spread = game.bookmakers[0]?.markets.find((m: any) => m.key === 'spreads');
      const line = spread?.outcomes[0]?.point || 0;

      console.log('Processing game:', {
        away: game.away_team,
        home: game.home_team,
        line: line
      });

      return {
        id: `week8_${index}`,
        weekNumber: "8",
        away_team: game.away_team,
        home_team: game.home_team,
        commence_time: game.commence_time,
        vegas_line: line
      };
    });
  } catch (error) {
    console.error('Error in fetchOddsData:', error);
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
  try {
    console.log('Starting GET request handler...');
    let games = await fetchOddsData();
    
    console.log('Fetched games length:', games.length);
    
    // If API fails or returns no games, use mock data
    if (games.length === 0) {
      console.log('No games from API, using mock data');
      const mockData = createMockData();
      games = mockData.games;
    }

    // Create full response
    const currentWeek = getCurrentWeekNumber();
    const weeks = createMockData().weeks;

    const response = {
      games,
      weeks,
      currentWeek
    };
    
    console.log('Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ error: 'Failed to fetch odds' }, { status: 500 });
  }
}