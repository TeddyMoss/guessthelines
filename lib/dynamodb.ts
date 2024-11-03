import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Validate environment variables but don't throw
function getCredentials() {
  const credentials = {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID,
    secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY
  };

  const missing = Object.entries(credentials)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn('Missing AWS credentials:', missing);
  }

  return credentials;
}

const credentials = getCredentials();

const client = new DynamoDBClient({
  region: credentials.region || 'us-east-1',
  credentials: {
    accessKeyId: credentials.accessKeyId || '',
    secretAccessKey: credentials.secretAccessKey || ''
  },
  maxAttempts: 3
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

export async function saveUserPicks(userId: string, picks: any[]) {
  console.log('Attempting to save picks:', {
    hasCredentials: !!credentials.accessKeyId && !!credentials.secretAccessKey
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
    await docClient.send(new PutCommand(params));
    return { success: true };
  } catch (error) {
    console.error('Error saving picks:', error);
    return { success: false, error: 'Failed to save picks' };
  }
}

export async function getUserPicks(userId: string) {
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
    const result = await docClient.send(new QueryCommand(params));
    return result.Items;
  } catch (error) {
    console.error('Error fetching picks:', error);
    return [];
  }
}