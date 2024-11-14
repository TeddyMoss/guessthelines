// lib/dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { fetchAuthSession } from 'aws-amplify/auth';

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

const getDocClient = async () => {
  try {
    const session = await fetchAuthSession();
    
    if (!session?.credentials) {
      throw new Error('No valid authentication session');
    }

    const client = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: session.credentials
    });

    return DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true
      }
    });
  } catch (error) {
    console.error('Error getting DynamoDB client:', error);
    throw new Error('Failed to initialize database connection. Please log in again.');
  }
};

// Check if line prediction was accurate (within 3 points)
const isAccuratePick = (predicted: number, actual: number) => Math.abs(predicted - actual) <= 3;

// Check if line prediction was perfect
const isPerfectPick = (predicted: number, actual: number) => Math.abs(predicted - actual) <= 0.5;

export async function saveUserPicks(userId: string, week: string, picks: UserPick[]) {
  if (!userId || !week || !picks) {
    throw new Error('Missing required parameters for saving picks');
  }

  try {
    const docClient = await getDocClient();
    
    // Validate picks data
    if (!Array.isArray(picks) || picks.length === 0) {
      throw new Error('Invalid picks data');
    }

    // First, save individual picks
    const savePicksPromises = picks.map(pick => 
      docClient.send(new PutCommand({
        TableName: 'UserPicks',
        Item: {
          userId,
          gameId: pick.gameId,
          team: pick.team,
          predictedLine: pick.predictedLine,
          actualLine: pick.actualLine,
          week,
          timestamp: new Date().toISOString()
        }
      }))
    );

    // Calculate stats for this week
    const weekStats = picks.reduce((stats, pick) => ({
      picks: stats.picks + 1,
      accurate: stats.accurate + (isAccuratePick(pick.predictedLine, pick.actualLine) ? 1 : 0),
      perfect: stats.perfect + (isPerfectPick(pick.predictedLine, pick.actualLine) ? 1 : 0),
    }), { picks: 0, accurate: 0, perfect: 0 });

    // Get existing user stats
    const existingStats = await docClient.send(new GetCommand({
      TableName: 'UserStats',
      Key: { userId }
    }));

    const currentStats = existingStats.Item as UserStats || {
      userId,
      totalPicks: 0,
      accurateGuesses: 0,
      perfectGuesses: 0,
      averageDeviation: 0,
      weeklyStats: {}
    };

    // Update overall stats
    const newStats = {
      ...currentStats,
      totalPicks: currentStats.totalPicks + weekStats.picks,
      accurateGuesses: currentStats.accurateGuesses + weekStats.accurate,
      perfectGuesses: currentStats.perfectGuesses + weekStats.perfect,
      weeklyStats: {
        ...currentStats.weeklyStats,
        [week]: weekStats
      }
    };

    // Calculate new average deviation
    const totalDeviation = picks.reduce((sum, pick) => 
      sum + Math.abs(pick.predictedLine - pick.actualLine), 0);
    newStats.averageDeviation = 
      ((currentStats.averageDeviation * currentStats.totalPicks) + totalDeviation) / 
      (currentStats.totalPicks + picks.length);

    // Save updated stats
    await docClient.send(new PutCommand({
      TableName: 'UserStats',
      Item: newStats
    }));

    await Promise.all(savePicksPromises);
    return { success: true };
  } catch (error) {
    console.error('Error saving picks:', error);
    if (error instanceof Error && error.message.includes('Failed to initialize database')) {
      throw error;
    }
    throw new Error('Failed to save picks. Please try again.');
  }
}

export async function getUserPicks(userId: string, week?: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const docClient = await getDocClient();
    
    let queryParams: any = {
      TableName: 'UserPicks',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    if (week) {
      queryParams.KeyConditionExpression += ' and week = :week';
      queryParams.ExpressionAttributeValues[':week'] = week;
    }

    const result = await docClient.send(new QueryCommand(queryParams));
    return result.Items || [];
  } catch (error) {
    console.error('Error fetching picks:', error);
    if (error instanceof Error && error.message.includes('Failed to initialize database')) {
      throw error;
    }
    throw new Error('Failed to fetch picks. Please try again.');
  }
}

export async function getUserStats(userId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const docClient = await getDocClient();
    
    const result = await docClient.send(new GetCommand({
      TableName: 'UserStats',
      Key: { userId }
    }));
    return result.Item as UserStats || null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    if (error instanceof Error && error.message.includes('Failed to initialize database')) {
      throw error;
    }
    throw new Error('Failed to fetch user stats. Please try again.');
  }
}