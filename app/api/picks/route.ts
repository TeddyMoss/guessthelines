import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

console.log('API credentials check:', {
  hasAccessKeyId: !!process.env.AMPLIFY_ACCESS_KEY_ID,
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

const docClient = DynamoDBDocumentClient.from(client);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const week = searchParams.get('week');

  console.log('GET Request params:', { userId, week });

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
      queryParams.KeyConditionExpression += ' and week = :week';
      queryParams.ExpressionAttributeValues[':week'] = week;
    }

    console.log('DynamoDB query params:', queryParams);
    const result = await docClient.send(new QueryCommand(queryParams));
    console.log('Query result:', { itemCount: result.Items?.length });
    
    return NextResponse.json({
      picks: result.Items || []
    });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('POST Request body:', body);

    const { userId, week, picks } = body;
    console.log('Parsed data:', { userId, week, picksCount: picks?.length });

    if (!userId || !week || !picks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Save each pick
    const savePromises = picks.map((pick: any) => {
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

    await Promise.all(savePromises);
    console.log('Successfully saved all picks');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 });
  }
}