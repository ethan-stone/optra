import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

type IdempotencyKeyRow = {
  key: string;
  timestamp: number;
};

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getIdempotencyKey(
  key: string
): Promise<IdempotencyKeyRow | null> {
  const get = new GetCommand({
    TableName: Table.IdempotencyKeyTable.tableName,
    Key: {
      key: key,
    },
  });

  const results = await db.send(get);

  return results.Item ? (results.Item as IdempotencyKeyRow) : null;
}

export async function putIdempotencyKey(key: string): Promise<void> {
  const put = new PutCommand({
    TableName: Table.IdempotencyKeyTable.tableName,
    Item: {
      key: key,
      timestamp: Date.now(),
    },
  });

  await db.send(put);
}
