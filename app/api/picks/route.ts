import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Debug AWS credentials
const credentials = {
  accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY!
};

console.log('Route initialization:', {
  hasAccessKey: !!credentials.accessKeyId,
  hasSecretKey: !!credentials.secretAccessKey,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  tableName: 'UserPicks'
});

const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});

export async function POST(request: Request) {
  try {
    // Parse and validate request
    const body = await request.json();
    console.log('Received request:', {
      hasUserId: !!body.userId,
      hasWeek: !!body.week,
      picksLength: body.picks?.length,
      firstPick: body.picks?.[0]
    });

    const { userId, week, picks } = body;

    if (!userId || !week || !picks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Try a test query first
    try {
      console.log('Testing DynamoDB connection...');
      const testResult = await docClient.send(new QueryCommand({
        TableName: 'UserPicks',
        Limit: 1,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      }));
      console.log('Test query successful');
    } catch (testError) {
      console.error('Test query failed:', {
        error: testError,
        message: testError instanceof Error ? testError.message : 'Unknown error',
        code: testError instanceof Error ? (testError as any).code : undefined
      });
      throw new Error('Database connection test failed');
    }

    // Save picks
    console.log('Starting to save picks...');
    const savePromises = picks.map(async (pick: any, index: number) => {
      const item = {
        userId,
        weekId: week,
        team: pick.team,
        predictedLine: pick.predictedLine,
        actualLine: pick.actualLine,
        gameId: pick.gameId,
        timestamp: new Date().toISOString()
      };
      
      try {
        console.log(`Saving pick ${index + 1}:`, item);
        const result = await docClient.send(new PutCommand({
          TableName: 'UserPicks',
          Item: item
        }));
        console.log(`Pick ${index + 1} saved successfully`);
        return result;
      } catch (saveError) {
        console.error(`Error saving pick ${index + 1}:`, {
          error: saveError,
          message: saveError instanceof Error ? saveError.message : 'Unknown error',
          code: saveError instanceof Error ? (saveError as any).code : undefined,
          item
        });
        throw saveError;
      }
    });

    await Promise.all(savePromises);
    console.log('All picks saved successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Detailed save error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error ? (error as any).code : undefined,
      name: error instanceof Error ? error.name : 'Unknown type',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to save picks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}