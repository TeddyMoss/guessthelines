import { NextResponse } from 'next/server';

const API_KEY = process.env.ODDS_API_KEY;

interface WeekInfo {
  number: string;
  startDate: string;
  available: boolean;
}

interface WeekResponse {
  games: any[];
  weeks: WeekInfo[];
  currentWeek: string;
}

function getCurrentWeekNumber(): string {
  const seasonStart = new Date('2023-09-07'); // NFL 2023 season start
  const today = new Date();
  
  // If before season start, return first available week
  if (today < seasonStart) return '8';
  
  const diffTime = today.getTime() - seasonStart.getTime();
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.min(Math.max(8, diffWeeks), 18).toString();
}

function createMockData(): WeekResponse {
  const games = [];
  const currentWeek = getCurrentWeekNumber();
  
  // Create week information
  const weeks: WeekInfo[] = [];
  
  // Regular season weeks (8-18)
  for (let week = 8; week <= 18; week++) {
    const weekStart = new Date('2023-09-07');
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    
    weeks.push({
      number: week.toString(),
      startDate: weekStart.toISOString(),
      available: week <= parseInt(currentWeek)
    });
  }

  // Playoff weeks
  const playoffWeeks = [
    { number: 'wild-card', date: '2024-01-13' },
    { number: 'divisional', date: '2024-01-20' },
    { number: 'conference', date: '2024-01-27' },
    { number: 'super-bowl', date: '2024-02-11' }
  ];

  playoffWeeks.forEach(week => {
    weeks.push({
      number: week.number,
      startDate: new Date(week.date).toISOString(),
      available: false // Playoffs not available until regular season ends
    });
  });

  // Weekly matchups
  const weeklyGames = {
    '8': [
      { away: "Buccaneers", home: "Bills", line: -3.5 },
      { away: "Rams", home: "Cowboys", line: -7 },
      { away: "Vikings", home: "Packers", line: -2.5 },
      { away: "Saints", home: "Colts", line: -1.5 }
    ],
    '9': [
      { away: "Titans", home: "Steelers", line: -3 },
      { away: "Dolphins", home: "Chiefs", line: -6.5 },
      { away: "Vikings", home: "Falcons", line: -4 },
      { away: "Seahawks", home: "Ravens", line: -5.5 }
    ],
    // Add more weeks as needed
  };

  // Create regular season games
  Object.entries(weeklyGames).forEach(([week, matchups]) => {
    const weekInfo = weeks.find(w => w.number === week);
    if (!weekInfo?.available) return;

    matchups.forEach((game, index) => {
      games.push({
        id: `week${week}-game${index}`,
        weekNumber: week,
        away_team: game.away,
        home_team: game.home,
        commence_time: weekInfo.startDate,
        vegas_line: game.line,
        type: 'regular'
      });
    });
  });

  // Add playoff placeholders
  const playoffMessages = {
    'wild-card': '"Playoffs?! Don\'t talk about playoffs! You kidding me? Playoffs?! I just hope we can win a game!"',
    'divisional': '"I\'m just trying to be the best coach I can be... and right now that means telling you these games aren\'t available yet!"',
    'conference': '"Championships?! Let\'s talk about that after Week 18!"',
    'super-bowl': '"Super Bowl?! You wanna talk about the Super Bowl?! I just wanna see the regular season games!"'
  };

  playoffWeeks.forEach(week => {
    games.push({
      id: `playoff-${week.number}`,
      weekNumber: week.number,
      away_team: "TBD",
      home_team: "TBD",
      commence_time: new Date(week.date).toISOString(),
      vegas_line: 0,
      type: 'playoff',
      message: playoffMessages[week.number as keyof typeof playoffMessages]
    });
  });

  return {
    games,
    weeks: weeks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    currentWeek
  };
}

export async function GET() {
  try {
    const data = createMockData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create mock data' }, { status: 500 });
  }
}