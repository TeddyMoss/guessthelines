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

    console.log('Starting picks fetch:', { userId, week });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let queryParams = {
      TableName: 'UserPicks',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 100,
      ScanIndexForward: false  // Get most recent first
    };

    if (week) {
      queryParams.KeyConditionExpression += ' AND weekId = :weekId';
      queryParams.ExpressionAttributeValues[':weekId'] = week;
    }

    console.log('Query params:', queryParams);
    const result = await docClient.send(new QueryCommand(queryParams));
    
    console.log('Query response:', {
      itemCount: result.Items?.length,
      firstItem: result.Items?.[0],
      hasMore: !!result.LastEvaluatedKey
    });

    // If there are more items, get them all
    let allItems = result.Items || [];
    let lastKey = result.LastEvaluatedKey;

    while (lastKey) {
      const nextResult = await docClient.send(new QueryCommand({
        ...queryParams,
        ExclusiveStartKey: lastKey
      }));
      allItems = [...allItems, ...(nextResult.Items || [])];
      lastKey = nextResult.LastEvaluatedKey;
    }

    console.log('Final result:', {
      totalItems: allItems.length,
      uniqueWeeks: [...new Set(allItems.map(item => item.weekId))].sort()
    });

    return NextResponse.json({
      picks: allItems
    });
  } catch (error) {
    console.error('Error fetching picks:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
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
    console.error('Save error:', {
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