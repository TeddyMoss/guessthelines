import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(client);

export async function saveUserPicks(userId: string, picks: any[]) {
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
    throw new Error('Failed to save picks');
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
    throw new Error('Failed to fetch picks');
  }
}