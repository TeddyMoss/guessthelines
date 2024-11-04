import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

function getConfig() {
  const accessKeyId = process.env.AMPLIFY_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AMPLIFY_SECRET_ACCESS_KEY;
  const region = process.env.NEXT_PUBLIC_AWS_REGION;

  console.log('DynamoDB Config:', {
    hasAccessKey: !!accessKeyId,
    hasSecretKey: !!secretAccessKey,
    region,
    nodeEnv: process.env.NODE_ENV,
    keyPreview: accessKeyId ? `${accessKeyId.substring(0, 4)}...` : 'missing'
  });

  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error(`Missing AWS configuration: ${[
      !accessKeyId && 'ACCESS_KEY_ID',
      !secretAccessKey && 'SECRET_ACCESS_KEY',
      !region && 'REGION'
    ].filter(Boolean).join(', ')}`);
  }

  return {
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region
  };
}

// Initialize DynamoDB client with retries
const createClient = () => {
  const config = getConfig();
  
  const client = new DynamoDBClient({
    region: config.region,
    credentials: config.credentials,
    maxAttempts: 3
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: true
    }
  });
};

export async function saveUserPicks(userId: string, picks: any[]) {
  try {
    const docClient = createClient();
    
    console.log('Saving picks:', { 
      userId, 
      pickCount: picks.length 
    });
    
    await docClient.send(new PutCommand({
      TableName: 'UserPicks',
      Item: {
        userId,
        timestamp: new Date().toISOString(),
        picks,
      }
    }));

    console.log('Save successful:', { userId });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving picks:', {
      error: {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      },
      userId
    });
    return { 
      success: false, 
      error: error.code === 'CredentialsError' ? 'Authentication failed' : 
             'Failed to save picks' 
    };
  }
}

export async function getUserPicks(userId: string) {
  try {
    const docClient = createClient();
    
    console.log('Fetching picks for user:', userId);
    
    const result = await docClient.send(new QueryCommand({
      TableName: 'UserPicks',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false,
      Limit: 10
    }));

    console.log('Successfully retrieved picks:', { 
      userId, 
      count: result.Items?.length || 0 
    });
    
    return result.Items || [];
  } catch (error: any) {
    console.error('Error fetching picks:', {
      error: {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      },
      userId
    });
    return [];
  }
}