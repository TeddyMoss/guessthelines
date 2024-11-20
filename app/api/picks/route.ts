import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Debug log credentials
console.log('API Credentials Check:', {
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
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const week = searchParams.get('week');

    console.log('GET Request:', { userId, week });

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
      queryParams.KeyConditionExpression += ' and week = :week';
      queryParams.ExpressionAttributeValues[':week'] = week;
    }

    console.log('Query Params:', queryParams);
    const result = await docClient.send(new QueryCommand(queryParams));
    console.log('Query Result:', {
      success: true,
      itemCount: result.Items?.length
    });
    
    return NextResponse.json({
      picks: result.Items || []
    });
  } catch (error) {
    console.error('Error in GET:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch picks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('POST Request Body:', body);

    const { userId, week, picks } = body;

    if (!userId || !week || !picks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('Saving picks:', {
      userId,
      week,
      picksCount: picks.length,
      firstPick: picks[0]
    });

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
      console.log('Saving item:', item);
      
      return docClient.send(new PutCommand({
        TableName: 'UserPicks',
        Item: item
      }));
    });

    await Promise.all(savePromises);
    console.log('Successfully saved all picks');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to save picks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}