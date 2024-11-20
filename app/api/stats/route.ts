import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const result = await docClient.send(new GetCommand({
      TableName: 'UserStats',
      Key: { userId }
    }));

    return NextResponse.json({
      stats: result.Item || null
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, weekStats, picks } = await request.json();

    if (!userId || !weekStats || !picks?.length) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Get existing stats
    const existingStatsResult = await docClient.send(new GetCommand({
      TableName: 'UserStats',
      Key: { userId }
    }));

    const currentStats = existingStatsResult.Item as UserStats || {
      userId,
      totalPicks: 0,
      accurateGuesses: 0,
      perfectGuesses: 0,
      averageDeviation: 0,
      weeklyStats: {}
    };

    // Calculate new totals
    const newStats = {
      ...currentStats,
      totalPicks: currentStats.totalPicks + weekStats.picks,
      accurateGuesses: currentStats.accurateGuesses + weekStats.accurate,
      perfectGuesses: currentStats.perfectGuesses + weekStats.perfect,
      weeklyStats: {
        ...currentStats.weeklyStats,
        [picks[0].week]: weekStats
      }
    };

    // Calculate new average deviation
    const totalDeviation = picks.reduce((sum, pick) => 
      sum + Math.abs(pick.predictedLine - pick.actualLine), 0
    );
    newStats.averageDeviation = 
      ((currentStats.averageDeviation * currentStats.totalPicks) + totalDeviation) / 
      (currentStats.totalPicks + picks.length);

    // Save updated stats
    await docClient.send(new PutCommand({
      TableName: 'UserStats',
      Item: newStats
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating stats:', error);
    return NextResponse.json(
      { error: 'Failed to update stats' },
      { status: 500 }
    );
  }
}