import {
  CreateScheduleCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
import {
  ClientSecretExpiredScheduledEvent,
  ApiSigningSecretExpiredScheduledEvent,
  EventSchemas,
} from "./event-schemas";

type CreateOneTimeScheduleParams = {
  at: Date;
} & (ClientSecretExpiredScheduledEvent | ApiSigningSecretExpiredScheduledEvent);

export interface Scheduler {
  createOneTimeSchedule(params: CreateOneTimeScheduleParams): Promise<void>;
}

type ScheduleEventTypes =
  | "client.secret.expired"
  | "api.signing_secret.expired";

type AWSEventSchedulerConfig = {
  eventTypeToTargetMap: Record<ScheduleEventTypes, { arn: string }>;
  roleArn: string;
  dlqArn: string;
};

export class AWSEventScheduler implements Scheduler {
  private client: SchedulerClient;

  constructor(
    private readonly config: AWSEventSchedulerConfig,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ) {
    this.client = new SchedulerClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private mapEventTypeToTarget(eventType: ScheduleEventTypes) {
    const target = this.config.eventTypeToTargetMap[eventType];
    return target;
  }

  private getScheduleName(params: CreateOneTimeScheduleParams) {
    if (params.eventType === "client.secret.expired") {
      return `${params.eventType}-${params.payload.clientSecretId}`;
    } else if (params.eventType === "api.signing_secret.expired") {
      return `${params.eventType}-${params.payload.signingSecretId}`;
    }

    throw new Error(`Unknown event type: ${JSON.stringify(params)}`);
  }

  private getScheduleDescription(params: CreateOneTimeScheduleParams) {
    if (params.eventType === "client.secret.expired") {
      return `Client Secret expired: ${params.payload.clientSecretId}`;
    } else if (params.eventType === "api.signing_secret.expired") {
      return `Api Signing Secret expired: ${params.payload.signingSecretId}`;
    }

    throw new Error(`Unknown event type: ${JSON.stringify(params)}`);
  }

  async createOneTimeSchedule(params: CreateOneTimeScheduleParams) {
    const target = this.mapEventTypeToTarget(params.eventType);

    const event = EventSchemas.parse(params);

    const command = new CreateScheduleCommand({
      Name: this.getScheduleName(params),
      Description: this.getScheduleDescription(params),
      ScheduleExpression: `at(${params.at.toISOString().split(".")[0]})`,
      State: "ENABLED",
      Target: {
        Arn: target.arn,
        Input: JSON.stringify(event),
        RoleArn: this.config.roleArn,
        DeadLetterConfig: {
          Arn: this.config.dlqArn,
        },
        SqsParameters: {
          MessageGroupId: params.payload.workspaceId,
        },
      },
      FlexibleTimeWindow: { Mode: "OFF" },
      ActionAfterCompletion: "DELETE",
    });

    await this.client.send(command);
  }
}
