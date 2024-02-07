import { StackContext, Table } from "sst/constructs";

export function DynamoDBStack({ stack }: StackContext) {
  const idempotencyKeyTable = new Table(stack, "IdempotencyKeys", {
    fields: {
      key: "string",
      timestamp: "number",
    },
    primaryIndex: { partitionKey: "key" },
  });

  return { idempotencyKeyTable };
}
