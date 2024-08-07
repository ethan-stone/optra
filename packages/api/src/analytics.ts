import { z } from 'zod';
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { uid } from './uid';
import { TokenGeneratedEvent } from '@optra/core/event-schemas';

const AnalyticsEventTypes = z.enum(['token.generated', 'token.verified']);

type AnalyticsEventType = z.infer<typeof AnalyticsEventTypes>;

const AnalyticsEventPayloads = {
	'token.generated': z.object({
		clientId: z.string(),
		workspaceId: z.string(),
		apiId: z.string(),
		timestamp: z.number(),
	}),
	'token.verified': z.object({
		clientId: z.string(),
		workspaceId: z.string(),
		apiId: z.string(),
		timestamp: z.number(),
		deniedReason: z.enum(['EXPIRED', 'RATELIMIT_EXCEEDED', 'SECRET_EXPIRED', 'VERSION_MISMATCH', 'MISSING_SCOPES', 'FORBIDDEN']).nullable(),
	}),
};

type AnalyticsEventPayload<T extends AnalyticsEventType> = z.infer<(typeof AnalyticsEventPayloads)[T]>;

type GetVerificationForWorkspace = {
	workspaceId: string;
	month: number;
	year: number;
};

type GetVerificationsForWorkspaceResponse = {
	successful: number;
	failed: number;
};

type GetGenerationsForWorkspaceResponse = {
	total: number;
};

export interface Analytics {
	publish: <T extends AnalyticsEventType>(eventType: T, payload: AnalyticsEventPayload<T>[]) => Promise<void>;
	getVerificationsForWorkspace: (params: GetVerificationForWorkspace) => Promise<GetVerificationsForWorkspaceResponse>;
	getGenerationsForWorkspace: (params: GetVerificationForWorkspace) => Promise<GetGenerationsForWorkspaceResponse>;
}

type TinyBirdAnalyticsConfig = {
	baseUrl: string;
	apiKey: string;
	eventTypeDatasourceMap: Record<AnalyticsEventType, string>;
	verificationForWorkspaceEndpoint: string;
	generationsForWorkspaceEndpoint: string;
};

export class TinyBirdAnalytics implements Analytics {
	constructor(private readonly config: TinyBirdAnalyticsConfig) {}

	async publish<T extends AnalyticsEventType>(eventType: T, payloads: AnalyticsEventPayload<T>[]): Promise<void> {
		const validEventType = await AnalyticsEventTypes.safeParseAsync(eventType);

		if (!validEventType.success) {
			throw new Error(`Invalid event type: ${eventType}`);
		}

		const url = new URL('/v0/events', this.config.baseUrl);
		const datasource = this.config.eventTypeDatasourceMap[eventType];
		url.searchParams.set('name', datasource);

		const payloadSchema = AnalyticsEventPayloads[eventType];

		const validPayloads = await payloadSchema.array().safeParseAsync(payloads);

		if (!validPayloads.success) {
			throw new Error(`Invalid payload: ${JSON.stringify(validPayloads.error.issues)}`);
		}

		const body = validPayloads.data.map((payload) => JSON.stringify(payload)).join('\n');

		const req = new Request(url, {
			method: 'POST',
			body: body,
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
			},
		});

		const res = await fetch(req);

		if (!res.ok) {
			throw new Error(`Failed to publish ${eventType} analytics. Status: ${res.status} ${await res.text()}`);
		}
	}

	async getVerificationsForWorkspace(params: GetVerificationForWorkspace): Promise<GetVerificationsForWorkspaceResponse> {
		const url = new URL(this.config.verificationForWorkspaceEndpoint);

		url.searchParams.set('workspaceId', params.workspaceId);
		url.searchParams.set('month', params.month.toString());
		url.searchParams.set('year', params.year.toString());
		url.searchParams.set('token', this.config.apiKey);

		const req = new Request(url, {
			method: 'GET',
		});

		const res = await fetch(req);

		if (!res.ok) {
			throw new Error(`Failed to get verifications for workspace. Status: ${res.status} ${await res.text()}`);
		}

		const resJson = (await res.json()) as any;

		if (resJson.data.length === 0) {
			return {
				successful: 0,
				failed: 0,
			};
		}

		const data = resJson.data[0];

		const schema = z.object({
			success: z.number().min(0),
			failure: z.number().min(0),
			timestamp: z.string(),
		});

		const validData = schema.parse(data);

		return {
			successful: validData.success,
			failed: validData.failure,
		};
	}

	async getGenerationsForWorkspace(params: GetVerificationForWorkspace): Promise<GetGenerationsForWorkspaceResponse> {
		const url = new URL(this.config.generationsForWorkspaceEndpoint);

		url.searchParams.set('workspaceId', params.workspaceId);
		url.searchParams.set('month', params.month.toString());
		url.searchParams.set('year', params.year.toString());
		url.searchParams.set('token', this.config.apiKey);

		const req = new Request(url, {
			method: 'GET',
		});

		const res = await fetch(req);

		if (!res.ok) {
			throw new Error(`Failed to get generations for workspace. Status: ${res.status} ${await res.text()}`);
		}

		const resJson = (await res.json()) as any;

		if (resJson.data.length === 0) {
			return {
				total: 0,
			};
		}

		const data = resJson.data[0];

		const schema = z.object({
			total: z.number().min(0),
			timestamp: z.string(),
		});

		const validData = schema.parse(data);

		return {
			total: validData.total,
		};
	}
}

export class SQSAndPgAnalytics implements Analytics {
	constructor(
		private sqsClient: SQSClient,
		private queueUrl: string,
	) {}

	async publish<T extends AnalyticsEventType>(eventType: T, payloads: AnalyticsEventPayload<T>[]): Promise<void> {
		const validEventType = await AnalyticsEventTypes.safeParseAsync(eventType);

		if (!validEventType.success) {
			throw new Error(`Invalid event type: ${eventType}`);
		}

		const payloadSchema = AnalyticsEventPayloads[eventType];

		const validPayloads = await payloadSchema.array().safeParseAsync(payloads);

		if (!validPayloads.success) {
			throw new Error(`Invalid payload: ${JSON.stringify(validPayloads.error.issues)}`);
		}

		const sendMessageCommand = new SendMessageBatchCommand({
			QueueUrl: this.queueUrl,
			Entries: validPayloads.data.map((p) => ({
				Id: uid(),
				MessageBody: JSON.stringify({
					eventType: 'token.generated',
					payload: p,
					timestamp: Date.now(),
				} satisfies TokenGeneratedEvent),
			})),
		});

		await this.sqsClient.send(sendMessageCommand);
	}

	async getVerificationsForWorkspace(_: GetVerificationForWorkspace): Promise<GetVerificationsForWorkspaceResponse> {
		return {
			successful: 1000,
			failed: 500,
		};
	}
	async getGenerationsForWorkspace(_: GetVerificationForWorkspace): Promise<GetGenerationsForWorkspaceResponse> {
		return {
			total: 1000,
		};
	}
}

export class NoopAnalytics implements Analytics {
	async publish<T extends AnalyticsEventType>(_: T, __: AnalyticsEventPayload<T>[]): Promise<void> {
		return;
	}

	async getVerificationsForWorkspace(_: GetVerificationForWorkspace): Promise<GetVerificationsForWorkspaceResponse> {
		return {
			successful: 1000,
			failed: 500,
		};
	}
	async getGenerationsForWorkspace(_: GetVerificationForWorkspace): Promise<GetGenerationsForWorkspaceResponse> {
		return {
			total: 1000,
		};
	}
}
