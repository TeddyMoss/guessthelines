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
  console.log('=====================================');
  console.log('STARTING ODDS API FETCH');
  const API_KEY = process.env.ODDS_API_KEY;
  console.log('API Key Present:', !!API_KEY);
  
  if (!API_KEY) {
    console.error('NO API KEY FOUND IN ENVIRONMENT');
    return [];
  }

  const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
  const fullUrl = `${ODDS_API_URL}?apiKey=${API_KEY}&regions=us&markets=spreads`;
  console.log('API URL (excluding key):', ODDS_API_URL);

  try {
    console.log('Making fetch request...');
    const response = await fetch(fullUrl);
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Got API data:', !!data);
    return processApiData(data);
  } catch (error) {
    console.error('ERROR IN FETCH:', error);
    return [];
  }
}

function processApiData(data: any[]): Game[] {
  console.log('Processing API data...');
  return data.map((game: any, index: number) => {
    console.log(`Processing game ${index}:`, game.home_team, 'vs', game.away_team);
    const spread = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
    const line = spread?.outcomes[0]?.point || 0;

    return {
      id: `week8_${index}`,
      weekNumber: "8",
      away_team: game.away_team,
      home_team: game.home_team,
      commence_time: game.commence_time,
      vegas_line: line
    };
  });
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
  console.log('=====================================');
  console.log('ODDS API ROUTE HANDLER STARTING');
  
  try {
    let games = await fetchOddsData();
    console.log('Games fetched:', games.length);

    if (games.length === 0) {
      console.log('No games from API - using mock data');
      const mockData = createMockData();
      games = mockData.games;
    } else {
      console.log('Using real API data');
    }

    const currentWeek = getCurrentWeekNumber();
    const weeks = createMockData().weeks;

    const response = {
      games,
      weeks,
      currentWeek
    };

    console.log('Sending response with games:', response.games.length);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(createMockData());
  }
}