import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

export async function GET() {
  try {
    console.log('Starting test route - GET');
    return await runTest();
  } catch (error) {
    return handleError(error);
  }
}

export async function POST() {
  try {
    console.log('Starting test route - POST');
    return await runTest();
  } catch (error) {
    return handleError(error);
  }
}

async function runTest() {
  // Log environment variables
  console.log('Environment variables:', {
    hasAccessKey: !!process.env.AMPLIFY_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AMPLIFY_SECRET_ACCESS_KEY,
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    tableName: 'UserPicks'
  });

  // Try to create DynamoDB client
  const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    credentials: {
      accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY!
    }
  });

  const docClient = DynamoDBDocumentClient.from(client);

  // Try a simple query
  const result = await docClient.send(new QueryCommand({
    TableName: 'UserPicks',
    Limit: 1,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': 'test'
    }
  }));

  return NextResponse.json({
    status: 'success',
    envVarsPresent: {
      accessKey: !!process.env.AMPLIFY_ACCESS_KEY_ID,
      secretKey: !!process.env.AMPLIFY_SECRET_ACCESS_KEY,
      region: !!process.env.NEXT_PUBLIC_AWS_REGION
    },
    queryResult: {
      success: true,
      itemCount: result.Items?.length ?? 0
    }
  });
}

function handleError(error: unknown) {
  console.error('Test route error:', {
    error,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });

  return NextResponse.json({
    status: 'error',
    error: 'Test failed',
    details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
}