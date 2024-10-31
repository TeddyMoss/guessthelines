import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDB({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!
  }
});

export const docClient = DynamoDBDocument.from(client);

export async function savePicks(userId: string, weekId: string, picks: any) {
  return docClient.put({
    TableName: "UserPicks",
    Item: {
      userId,
      weekId,
      picks,
      timestamp: new Date().toISOString()
    }
  });
}