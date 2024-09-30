import { getDrizzle } from "@optra/core/drizzle";
import { CloudWatchLogsHandler, CloudWatchLogsDecodedData } from "aws-lambda";
import { Resource } from "sst";
import { gunzipSync } from "zlib";
import { DrizzleTokenGenerationRepo } from "@optra/core/token-generations";
import { DrizzleTokenVerificationRepo } from "@optra/core/token-verifications";
import { z } from "zod";
import { BaselimeEvent, sendEvents } from "../utils/baselime";

const LogSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("metric"),
    metric: z.discriminatedUnion("name", [
      z.object({
        name: z.literal("token.generated"),
        workspaceId: z.string(),
        clientId: z.string(),
        apiId: z.string(),
        timestamp: z.number(),
      }),
      z.object({
        name: z.literal("token.verified"),
        workspaceId: z.string(),
        clientId: z.string(),
        apiId: z.string(),
        timestamp: z.number(),
        deniedReason: z.string().nullish(),
      }),
    ]),
  }),
  z.object({
    type: z.literal("log"),
    requestId: z.string(),
    level: z.string(),
    namespace: z.string(),
    service: z.string(),
    dataset: z.string(),
    duration: z.number().nullish(),
    timestamp: z.number(),
  }),
]);

const decodeCloudWatchLogsEventData = (
  data: string
): CloudWatchLogsDecodedData => {
  const body = Buffer.from(data, "base64");
  const decodedData = JSON.parse(gunzipSync(body).toString("ascii"));
  return decodedData as CloudWatchLogsDecodedData;
};

export const handler: CloudWatchLogsHandler = async (event) => {
  const { db } = await getDrizzle(Resource.DbUrl.value);
  const tokenGenerationRepo = new DrizzleTokenGenerationRepo(db);
  const tokenVerificationRepo = new DrizzleTokenVerificationRepo(db);

  const decoded = decodeCloudWatchLogsEventData(event.awslogs.data);

  const eventsGroupedByDataset: Record<string, BaselimeEvent[]> = {};

  for (const logEvent of decoded.logEvents) {
    const trimmedMsg = logEvent.message.trim();
    const splitMsg = trimmedMsg.split("\t");

    if (splitMsg.length === 4) {
      const fourthItem = splitMsg[3];
      const jsonStartIndex = fourthItem.indexOf("{");

      if (jsonStartIndex !== -1) {
        const jsonString = fourthItem.slice(jsonStartIndex);
        const msg = fourthItem.slice(0, jsonStartIndex);

        let parsedJson: string;

        try {
          parsedJson = JSON.parse(jsonString);

          console.log("Successfully parsed JSON from log event.");
        } catch (error) {
          console.error("Error parsing JSON:", error);
          return;
        }

        const parsed = LogSchema.safeParse(parsedJson);

        if (parsed.success) {
          if (parsed.data.type === "metric") {
            if (parsed.data.metric.name === "token.generated") {
              await tokenGenerationRepo.create({
                workspaceId: parsed.data.metric.workspaceId,
                apiId: parsed.data.metric.apiId,
                clientId: parsed.data.metric.clientId,
                timestamp: new Date(parsed.data.metric.timestamp),
              });

              console.log("Created token generation record.");
            } else if (parsed.data.metric.name === "token.verified") {
              await tokenVerificationRepo.create({
                workspaceId: parsed.data.metric.workspaceId,
                apiId: parsed.data.metric.apiId,
                clientId: parsed.data.metric.clientId,
                timestamp: new Date(parsed.data.metric.timestamp),
                deniedReason: parsed.data.metric.deniedReason,
              });

              console.log("Created token verification record.");
            }
          } else if (parsed.data.type === "log") {
            if (!eventsGroupedByDataset[parsed.data.dataset]) {
              eventsGroupedByDataset[parsed.data.dataset] = [];
            }

            eventsGroupedByDataset[parsed.data.dataset].push({
              message: msg,
              ...parsed.data,
            });
          }
        } else {
          console.log("Log event is not a metric or a log.");
          console.log(parsed.error);
        }
      }
    } else {
      console.warn(
        "Unexpected number of items after splitting:",
        splitMsg.length
      );
    }
  }

  try {
    for (const dataset of Object.keys(eventsGroupedByDataset)) {
      await sendEvents(dataset, eventsGroupedByDataset[dataset]);
    }
  } catch (error) {
    console.error("Error sending events to Baselime:", error);
  }
};
