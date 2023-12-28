import { z } from 'zod';
import { SecretExpiredScheduledEvent } from '@optra/core/secret-expired-scheduled-event';
import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';

type CreateOneTimeScheduleParams =
	| {
			at: Date;
	  } & {
			eventType: 'secret.expired';
			payload: z.infer<typeof SecretExpiredScheduledEvent>;
	  };

export interface Scheduler {
	createOneTimeSchedule(params: CreateOneTimeScheduleParams): Promise<void>;
}

type AWSEventSchedulerConfig = {
	secretExpiredTarget: {
		arn: string;
	};
	roleArn: string;
};

export class AWSEventScheduler implements Scheduler {
	constructor(private readonly schedulerClient: SchedulerClient, private readonly config: AWSEventSchedulerConfig) {}

	private mapEventTypeToTarget(eventType: CreateOneTimeScheduleParams['eventType']) {
		switch (eventType) {
			case 'secret.expired':
				return this.config.secretExpiredTarget;
			default:
				throw new Error(`Unknown event type: ${eventType}`);
		}
	}

	async createOneTimeSchedule(params: CreateOneTimeScheduleParams) {
		const target = this.mapEventTypeToTarget(params.eventType);

		const command = new CreateScheduleCommand({
			Name: `secret-expired-${params.payload.secretId}`,
			Description: `Secret expired: ${params.payload.secretId}`,
			ScheduleExpression: `at(${params.at.toISOString().split('.')[0]})`,
			State: 'ENABLED',
			Target: {
				Arn: target.arn,
				Input: JSON.stringify(params.payload),
				RoleArn: this.config.roleArn,
			},
			FlexibleTimeWindow: { Mode: 'OFF' },
			ActionAfterCompletion: 'DELETE',
		});

		await this.schedulerClient.send(command);
	}
}
