import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY!
  }
});

// Create DocumentClient
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// Helper to check if credentials are available
const checkCredentials = () => {
  console.log('Checking AWS credentials:', {
    hasRegion: !!process.env.NEXT_PUBLIC_AWS_REGION,
    hasAccessKey: !!process.env.AMPLIFY_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AMPLIFY_SECRET_ACCESS_KEY
  });
};

export async function saveUserPicks(userId: string, picks: any[]) {
  checkCredentials();
  
  try {
    await docClient.send(new PutCommand({
      TableName: 'UserPicks',
      Item: {
        userId,
        timestamp: new Date().toISOString(),
        picks,
      }
    }));
    return { success: true };
  } catch (error) {
    console.error('Error saving picks:', {
      error,
      userId,
      hasCredentials: !!process.env.AMPLIFY_ACCESS_KEY_ID
    });
    return { success: false, error: 'Failed to save picks' };
  }
}

export async function getUserPicks(userId: string) {
  checkCredentials();
  
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: 'UserPicks',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false,
      Limit: 10
    }));
    return result.Items || [];
  } catch (error) {
    console.error('Error fetching picks:', error);
    return [];
  }
}