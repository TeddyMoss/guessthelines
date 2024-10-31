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

function createMockData(): WeekResponse {
  const games: Game[] = [];
  const currentWeek = getCurrentWeekNumber();

  // Create week information
  const weeks: WeekInfo[] = [];
  for (let i = 1; i <= 18; i++) {
    weeks.push({
      number: i.toString(),
      startDate: new Date(2024, 8, i * 7).toISOString(), // Example dates
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
    const data = createMockData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching odds:', error);
    return NextResponse.json({ error: 'Failed to fetch odds' }, { status: 500 });
  }
}