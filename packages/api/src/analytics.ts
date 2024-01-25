import { ZodTypeAny, z } from 'zod';

const AnalyticsEventTypes = z.enum(['token.issued', 'token.verified']);

type AnalyticsEventType = z.infer<typeof AnalyticsEventTypes>;

const AnalyticsEventPayloads: Record<AnalyticsEventType, ZodTypeAny> = {
	'token.issued': z.object({
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
		deniedReason: z.enum(['EXPIRED', 'RATELIMIT_EXCEEDED', 'SECRET_EXPIRED', 'VERSION_MISMATCH', 'MISSING_SCOPES', 'FORBIDDEN']),
	}),
};

type AnalyticsEventPayload<T extends AnalyticsEventType> = z.infer<(typeof AnalyticsEventPayloads)[T]>;

export interface Analytics {
	publish: <T extends AnalyticsEventType>(eventType: T, payload: AnalyticsEventPayload<T>) => Promise<void>;
}

type TinyBirdAnalyticsConfig = {
	baseUrl: string;
	apiKey: string;
	eventTypeDatasourceMap: Record<AnalyticsEventType, string>;
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
}
