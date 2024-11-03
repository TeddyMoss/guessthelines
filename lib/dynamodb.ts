import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Validate environment variables at startup
function validateEnvironmentVariables() {
  const requiredVars = {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID,
    secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required AWS credentials: ${missing.join(', ')}`);
  }

  return requiredVars;
}

const credentials = validateEnvironmentVariables();

const client = new DynamoDBClient({
  region: credentials.region,
  credentials: {
    accessKeyId: credentials.accessKeyId!,
    secretAccessKey: credentials.secretAccessKey!
  },
  maxAttempts: 3,
  retryMode: 'adaptive'
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});

export interface UserPick {
  userId: string;
  timestamp: string;
  picks: any[];
}

export async function saveUserPicks(userId: string, picks: any[]) {
  console.log('Starting saveUserPicks:', {
    userId,
    picksCount: picks.length,
    credentials: {
      hasRegion: !!credentials.region,
      hasAccessKey: !!credentials.accessKeyId,
      hasSecretKey: !!credentials.secretAccessKey
    }
  });

  const params = {
    TableName: 'UserPicks',
    Item: {
      userId,
      timestamp: new Date().toISOString(),
      picks,
    }
  };

  try {
    const startTime = Date.now();
    await docClient.send(new PutCommand(params));
    console.log(`Successfully saved picks in ${Date.now() - startTime}ms`);
    return { success: true };
  } catch (error) {
    console.error('Detailed error saving picks:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId,
      region: credentials.region
    });
    throw new Error('Failed to save picks: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function getUserPicks(userId: string) {
  console.log('Starting getUserPicks:', { userId });

  const params = {
    TableName: 'UserPicks',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false,
    Limit: 10
  };

  try {
    const startTime = Date.now();
    const result = await docClient.send(new QueryCommand(params));
    console.log(`Successfully retrieved picks in ${Date.now() - startTime}ms:`, {
      count: result.Items?.length || 0
    });
    return result.Items;
  } catch (error) {
    console.error('Detailed error fetching picks:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      userId,
      region: credentials.region
    });
    throw new Error('Failed to fetch picks: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}