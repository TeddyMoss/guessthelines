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
    console.log('Fetching auth session...');
    const session = await fetchAuthSession();
    console.log('Session details:', {
      hasSession: !!session,
      hasCredentials: !!session?.credentials,
      identityId: session?.identityId,
      accessKeyId: session?.credentials?.accessKeyId ? 'present' : 'missing',
      secretAccessKey: session?.credentials?.secretAccessKey ? 'present' : 'missing',
      sessionToken: session?.credentials?.sessionToken ? 'present' : 'missing'
    });
    
    if (!session?.credentials?.accessKeyId || !session?.credentials?.secretAccessKey) {
      console.error('Missing credentials in session:', {
        hasAccessKey: !!session?.credentials?.accessKeyId,
        hasSecretKey: !!session?.credentials?.secretAccessKey,
        hasSessionToken: !!session?.credentials?.sessionToken
      });
      throw new Error('Incomplete credentials in session');
    }

    const client = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken
      }
    });

    console.log('DynamoDB client created with region:', process.env.NEXT_PUBLIC_AWS_REGION);

    const docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true
      }
    });

    // Test the connection with actual user ID if available
    try {
      const testUserId = session?.identityId || 'test';
      await docClient.send(new QueryCommand({
        TableName: 'UserPicks',
        Limit: 1,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': testUserId
        }
      }));
      console.log('DynamoDB connection test successful');
    } catch (testError) {
      console.error('DynamoDB test query failed:', {
        error: testError,
        errorMessage: testError instanceof Error ? testError.message : 'Unknown error'
      });
    }

    return docClient;
  } catch (error) {
    console.error('Error getting DynamoDB client:', {
      error,
      errorType: error instanceof Error ? error.name : 'Unknown error type',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      hasIdentityPoolId: !!process.env.NEXT_PUBLIC_IDENTITY_POOL_ID
    });
    throw new Error('Failed to initialize database connection. Please try again or sign out and sign back in.');
  }
};
// Check if line prediction was accurate (within 3 points)
const isAccuratePick = (predicted: number, actual: number) => Math.abs(predicted - actual) <= 3;

// Check if line prediction was perfect
const isPerfectPick = (predicted: number, actual: number) => Math.abs(predicted - actual) <= 0.5;

export async function saveUserPicks(userId: string, week: string, picks: UserPick[]) {
  console.log('Starting saveUserPicks:', { userId, week, picksCount: picks?.length });
  
  if (!userId || !week || !picks) {
    console.error('Missing required parameters:', { userId, week, picks });
    throw new Error('Missing required parameters for saving picks');
  }

  try {
    const docClient = await getDocClient();
    console.log('DynamoDB client initialized');
    
    if (!Array.isArray(picks) || picks.length === 0) {
      console.error('Invalid picks data:', picks);
      throw new Error('Invalid picks data');
    }

    console.log('Preparing to save picks:', picks);
    const savePicksPromises = picks.map(pick => {
      const item = {
        userId,
        gameId: pick.gameId,
        team: pick.team,
        predictedLine: pick.predictedLine,
        actualLine: pick.actualLine,
        week,
        timestamp: new Date().toISOString()
      };
      console.log('Saving pick:', item);
      return docClient.send(new PutCommand({
        TableName: 'UserPicks',
        Item: item
      }));
    });

    const weekStats = picks.reduce((stats, pick) => ({
      picks: stats.picks + 1,
      accurate: stats.accurate + (isAccuratePick(pick.predictedLine, pick.actualLine) ? 1 : 0),
      perfect: stats.perfect + (isPerfectPick(pick.predictedLine, pick.actualLine) ? 1 : 0),
    }), { picks: 0, accurate: 0, perfect: 0 });

    console.log('Calculated week stats:', weekStats);

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

    const totalDeviation = picks.reduce((sum, pick) => 
      sum + Math.abs(pick.predictedLine - pick.actualLine), 0);
    newStats.averageDeviation = 
      ((currentStats.averageDeviation * currentStats.totalPicks) + totalDeviation) / 
      (currentStats.totalPicks + picks.length);

    console.log('Saving updated stats:', newStats);

    await docClient.send(new PutCommand({
      TableName: 'UserStats',
      Item: newStats
    }));

    await Promise.all(savePicksPromises);
    console.log('Successfully saved all picks and stats');
    return { success: true };
  } catch (error) {
    console.error('Error saving picks:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId,
      week,
      picksCount: picks?.length
    });
    if (error instanceof Error && error.message.includes('Failed to initialize database')) {
      throw error;
    }
    throw new Error('Failed to save picks. Please try again.');
  }
}

export async function getUserPicks(userId: string, week?: string) {
  console.log('Getting user picks:', { userId, week });
  
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

    console.log('Querying with params:', queryParams);
    const result = await docClient.send(new QueryCommand(queryParams));
    console.log('Query result:', { itemCount: result.Items?.length });
    return result.Items || [];
  } catch (error) {
    console.error('Error fetching picks:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId,
      week
    });
    if (error instanceof Error && error.message.includes('Failed to initialize database')) {
      throw error;
    }
    throw new Error('Failed to fetch picks. Please try again.');
  }
}

export async function getUserStats(userId: string) {
  console.log('Getting user stats:', { userId });
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const docClient = await getDocClient();
    
    const result = await docClient.send(new GetCommand({
      TableName: 'UserStats',
      Key: { userId }
    }));
    console.log('Got user stats:', { hasStats: !!result.Item });
    return result.Item as UserStats || null;
  } catch (error) {
    console.error('Error fetching user stats:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    if (error instanceof Error && error.message.includes('Failed to initialize database')) {
      throw error;
    }
    throw new Error('Failed to fetch user stats. Please try again.');
  }
}