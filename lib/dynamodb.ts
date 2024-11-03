import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

let docClient: DynamoDBDocumentClient | null = null;

try {
  const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY || ''
    }
  });

  docClient = DynamoDBDocumentClient.from(client);
} catch (error) {
  console.warn('Failed to initialize DynamoDB client:', error);
}

export async function saveUserPicks(userId: string, picks: any[]) {
  if (!docClient) {
    console.warn('DynamoDB client not initialized');
    return { success: false, error: 'Database not available' };
  }

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
    console.error('Error saving picks:', error);
    return { success: false, error: 'Failed to save picks' };
  }
}

export async function getUserPicks(userId: string) {
  if (!docClient) {
    console.warn('DynamoDB client not initialized');
    return [];
  }

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