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
      }
    };

    if (week) {
      queryParams.KeyConditionExpression += ' AND begins_with(gameKey, :weekPrefix)';
      queryParams.ExpressionAttributeValues[':weekPrefix'] = `WEEK#${week}`;
    }

    console.log('Query params:', queryParams);
    const result = await docClient.send(new QueryCommand(queryParams));
    
    console.log('Initial query response:', {
      itemCount: result.Items?.length,
      firstItem: result.Items?.[0],
      hasMore: !!result.LastEvaluatedKey
    });

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

    console.log('All fetched items:', allItems);

    // Transform items to extract week from gameKey and prepare for client
    const mappedItems = allItems.map(item => {
      const weekId = item.gameKey.split('#')[1];  // Extract week from WEEK#12#GAME#123
      return {
        weekId,
        team: item.team,
        predictedLine: item.predictedLine,
        actualLine: item.actualLine || 0,
        gameId: item.gameId,
        timestamp: item.timestamp
      };
    });

    // Group by week for logging
    const picksByWeek = mappedItems.reduce((acc, item) => {
      if (!acc[item.weekId]) {
        acc[item.weekId] = [];
      }
      acc[item.weekId].push(item);
      return acc;
    }, {});

    console.log('Picks grouped by week:', Object.entries(picksByWeek).map(([week, picks]) => ({
      week,
      count: picks.length,
      teams: picks.map(p => p.team)
    })));

    return NextResponse.json({
      picks: mappedItems
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
    
    console.log('Received picks data:', {
      userId,
      week,
      picksCount: picks?.length,
      picksDetail: picks?.map(p => ({
        team: p.team,
        predictedLine: p.predictedLine,
        gameId: p.gameId
      }))
    });

    if (!userId || !week || !picks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const savePromises = picks.map((pick: any) => {
      const gameKey = `WEEK#${week}#GAME#${pick.gameId}`;
      
      const item = {
        userId,
        gameKey,
        team: pick.team,
        predictedLine: pick.predictedLine,
        actualLine: pick.actualLine || 0,
        gameId: pick.gameId,
        timestamp: new Date().toISOString()
      };

      console.log('Saving pick item:', item);
      return docClient.send(new PutCommand({
        TableName: 'UserPicks',
        Item: item
      }));
    });

    await Promise.all(savePromises);
    
    console.log('Successfully saved all picks:', {
      userId,
      week,
      count: picks.length,
      savedPicks: picks.map(pick => ({
        team: pick.team,
        predictedLine: pick.predictedLine,
        gameId: pick.gameId,
        gameKey: `WEEK#${week}#GAME#${pick.gameId}`
      }))
    });
    
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