import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

console.log('Loading picks route. Checking credentials:', {
  hasAccessKey: !!process.env.AMPLIFY_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AMPLIFY_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION
});

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const week = searchParams.get('week');

  console.log('GET picks request:', { userId, week });

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    let queryParams: any = {
      TableName: 'UserPicks',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    if (week) {
      queryParams.KeyConditionExpression += ' and weekId = :weekId';
      queryParams.ExpressionAttributeValues[':weekId'] = week;
    }

    console.log('DynamoDB query:', queryParams);
    const result = await docClient.send(new QueryCommand(queryParams));
    console.log('Query result:', { items: result.Items?.length });

    return NextResponse.json({
      picks: result.Items || []
    });
  } catch (error) {
    console.error('GET Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to fetch picks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, week, picks } = await request.json();
    console.log('POST picks request:', { userId, week, picksCount: picks?.length });

    if (!userId || !week || !picks) {
      console.log('Missing parameters:', { userId, week, picks });
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('Processing picks:', picks[0]); // Log first pick for debugging

    const savePromises = picks.map(async (pick: any, index: number) => {
      try {
        const item = {
          userId,
          weekId: week,
          team: pick.team,
          predictedLine: pick.predictedLine,
          actualLine: pick.actualLine,
          gameId: pick.gameId,
          timestamp: new Date().toISOString()
        };
        console.log(`Saving pick ${index + 1}:`, item);

        const result = await docClient.send(new PutCommand({
          TableName: 'UserPicks',
          Item: item
        }));
        console.log(`Pick ${index + 1} saved`);
        return result;
      } catch (e) {
        console.error(`Error saving pick ${index + 1}:`, e);
        throw e;
      }
    });

    await Promise.all(savePromises);
    console.log('All picks saved successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to save picks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}