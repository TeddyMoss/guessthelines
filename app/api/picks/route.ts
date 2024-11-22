import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const week = searchParams.get('week');

    console.log('Fetching picks:', { userId, week });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

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

    const result = await docClient.send(new QueryCommand(queryParams));
    console.log('Query result:', { itemCount: result.Items?.length });

    return NextResponse.json({
      picks: result.Items || []
    });
  } catch (error) {
    console.error('Error fetching picks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch picks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, week, picks } = await request.json();
    console.log('Saving picks:', { userId, week, picksCount: picks?.length });

    if (!userId || !week || !picks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const savePromises = picks.map((pick: any) => {
      const item = {
        userId,
        weekId: week,
        team: pick.team,
        predictedLine: pick.predictedLine,
        actualLine: pick.actualLine,
        gameId: pick.gameId,
        timestamp: new Date().toISOString()
      };

      return docClient.send(new PutCommand({
        TableName: 'UserPicks',
        Item: item
      }));
    });

    await Promise.all(savePromises);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 });
  }
}