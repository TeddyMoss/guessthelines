// lib/dynamodb.ts
interface UserPick {
  userId: string;
  gameId: string;
  team: string;
  predictedLine: number;
  actualLine: number;
  week: string;
  timestamp: string;
}

interface UserStats {
  userId: string;
  totalPicks: number;
  accurateGuesses: number;
  perfectGuesses: number;
  averageDeviation: number;
  weeklyStats: {
    [week: string]: {
      picks: number;
      accurate: number;
      perfect: number;
    }
  }
}

// Helper functions
const isAccuratePick = (predicted: number, actual: number) => Math.abs(predicted - actual) <= 3;
const isPerfectPick = (predicted: number, actual: number) => Math.abs(predicted - actual) <= 0.5;

export async function saveUserPicks(userId: string, week: string, picks: UserPick[]) {
  console.log('Starting saveUserPicks:', { 
    userId, 
    week, 
    picksCount: picks?.length,
    picksData: JSON.stringify(picks, null, 2)
  });
  
  if (!userId || !week || !picks) {
    console.error('Missing required parameters:', { userId, week, picks });
    throw new Error('Missing required parameters for saving picks');
  }

  try {
    const response = await fetch('/api/picks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, week, picks })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to save picks:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error('Failed to save picks');
    }

    const result = await response.json();
    console.log('Save picks response:', {
      result,
      originalPicks: picks.length,
      picksDetail: picks.map(p => ({
        team: p.team,
        line: p.predictedLine,
        week: p.week
      }))
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving picks:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId,
      week,
      picksCount: picks?.length
    });
    throw new Error('Failed to save picks. Please try again.');
  }
}

export async function getUserPicks(userId: string, week?: string) {
  console.log('Getting user picks:', { userId, week });
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const url = new URL('/api/picks', window.location.origin);
    if (week) {
      url.searchParams.append('week', week);
    }
    url.searchParams.append('userId', userId);

    console.log('Fetching picks from URL:', url.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch picks:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error('Failed to fetch picks');
    }

    const data = await response.json();
    
    // Enhanced logging to track data structure
    console.log('getUserPicks response:', {
      totalPicks: data.picks?.length,
      samplePick: JSON.stringify(data.picks?.[0], null, 2),
      allWeeks: [...new Set(data.picks?.map(p => p.weekId || p.week))],
      picksByWeek: Object.entries(
        (data.picks || []).reduce((acc: Record<string, number>, pick: any) => {
          const weekKey = pick.weekId || pick.week;
          acc[weekKey] = (acc[weekKey] || 0) + 1;
          return acc;
        }, {})
      ).map(([week, count]) => `Week ${week}: ${count} picks`),
      allPicksDetail: data.picks?.map((p: any) => ({
        week: p.weekId || p.week,
        team: p.team,
        predictedLine: p.predictedLine,
        actualLine: p.actualLine,
        gameId: p.gameId
      }))
    });
    
    // Log the full data structure
    console.log('Full picks data:', JSON.stringify(data.picks, null, 2));
    
    return data.picks || [];
  } catch (error) {
    console.error('Error fetching picks:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId,
      week
    });
    throw new Error('Failed to fetch picks. Please try again.');
  }
}

export async function getUserStats(userId: string) {
  console.log('Getting user stats:', { userId });
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const response = await fetch(`/api/stats?userId=${userId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch stats:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();
    return data.stats as UserStats | null;
  } catch (error) {
    console.error('Error fetching user stats:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    throw new Error('Failed to fetch user stats. Please try again.');
  }
}