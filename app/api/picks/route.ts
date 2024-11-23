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
      queryParams.KeyConditionExpression += ' AND begins_with(sortKey, :weekPrefix)';
      queryParams.ExpressionAttributeValues[':weekPrefix'] = `${week}#`;
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
      uniqueWeeks: [...new Set(allItems.map(item => item.weekId))].sort(),
      itemSample: allItems.slice(0, 2)
    });

    // Map the items to ensure consistent field names and group by week
    const mappedItems = allItems.map(item => ({
      weekId: item.weekId,
      team: item.team,
      predictedLine: item.predictedLine,
      actualLine: item.actualLine || 0,
      gameId: item.gameId,
      timestamp: item.timestamp
    }));

    // Group by week to ensure we're returning all picks for each week
    const picksByWeek = mappedItems.reduce((acc, item) => {
      if (!acc[item.weekId]) {
        acc[item.weekId] = [];
      }
      acc[item.weekId].push(item);
      return acc;
    }, {});

    console.log('Picks by week:', Object.entries(picksByWeek).map(([week, picks]) => ({
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
      // Create a composite sort key that includes both week and gameId
      const sortKey = `${week}#${pick.gameId}`;
      
      const item = {
        userId,
        sortKey,  // Primary sort key combining week and gameId
        weekId: week,  // Additional field for easy querying
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
        sortKey: `${week}#${pick.gameId}`
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