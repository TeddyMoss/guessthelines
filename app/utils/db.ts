// app/utils/db.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const getCredentialsAndClient = () => {
  const idToken = localStorage.getItem('idToken');
  if (!idToken) {
    throw new Error('Authentication required. Please log in again.');
  }

  const credentials = fromCognitoIdentityPool({
    clientConfig: { region: process.env.NEXT_PUBLIC_AWS_REGION },
    identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID!,
    logins: {
      [`cognito-idp.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_USER_POOL_ID}`]: idToken
    }
  });

  return DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    credentials
  }));
};

export const savePicks = async (
  userId: string, 
  week: string, 
  picksToSave: Array<{
    gameId: string;
    team: string;
    line: number;
    actualLine?: number;
  }>
) => {
  try {
    const docClient = getCredentialsAndClient();
    
    const picks = picksToSave.map(pick => ({
      userId,
      week,
      gameId: pick.gameId,
      team: pick.team,
      line: pick.line,
      actualLine: pick.actualLine,
      createdAt: new Date().toISOString()
    }));

    const batchParams = {
      RequestItems: {
        [process.env.NEXT_PUBLIC_PICKS_TABLE_NAME!]: picks.map(pick => ({
          PutRequest: { Item: pick }
        }))
      }
    };

    await docClient.send(new BatchWriteCommand(batchParams));
    return { success: true, savedPicks: picks };
  } catch (error) {
    console.error('Error saving picks:', error);
    throw error;
  }
};

export const getUserPicks = async (userId: string) => {
  try {
    const docClient = getCredentialsAndClient();
    
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.NEXT_PUBLIC_PICKS_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));

    return result.Items || [];
  } catch (error) {
    console.error('Error fetching user picks:', error);
    throw error;
  }
};