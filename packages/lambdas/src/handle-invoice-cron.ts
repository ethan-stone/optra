import { ScheduledHandler } from "aws-lambda";
import { db } from "./db";
import { sqsClient } from "./sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { InvoiceWorkspaceEvent } from "@optra/core/event-schemas";
import { Config } from "sst/node/config";
import { retry } from "./retry";

export const handler: ScheduledHandler = async (event) => {
  console.log("Queueing invoice generation for all workspaces");

  const workspaces = await db.query.workspaceBillingInfo.findMany({
    where: (table, { and, not, eq, isNotNull }) =>
      and(not(eq(table.plan, "free")), isNotNull(table.subscriptions)),
  });

  console.log(`Found ${workspaces.length} workspaces to invoice`);

  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - 1);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  for (const workspace of workspaces) {
    console.log(`Queueing invoice for workspace ${workspace.workspaceId}`);

    const msg: InvoiceWorkspaceEvent = {
      eventType: "workspace.invoice",
      payload: {
        month: month,
        year: year,
        workspaceId: workspace.workspaceId,
      },
      timestamp: Date.now(),
    };

    try {
      await retry({
        callback: async () => {
          const command = new SendMessageCommand({
            MessageBody: JSON.stringify(InvoiceWorkspaceEvent.parse(msg)),
            QueueUrl: Config.MESSAGE_QUEUE_URL,
          });

          await sqsClient.send(command);
        },
        maxRetries: 3,
        retryDelay: 1000,
      });
    } catch (error) {
      console.error(error);
      console.error(
        `Failed to queue invoice for workspace ${workspace.workspaceId}`
      );
    }
  }
};
