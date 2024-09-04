import { BaselimeLogger } from '@baselime/edge-logger';
import { z } from 'zod';

export type Fields = {
	[key: string]: unknown;
};

const MetricFields = z.discriminatedUnion('name', [
	z.object({
		name: z.literal('token.generated'),
		workspaceId: z.string(),
		clientId: z.string(),
		apiId: z.string(),
		timestamp: z.number(),
	}),
	z.object({
		name: z.literal('token.verified'),
		workspaceId: z.string(),
		clientId: z.string(),
		apiId: z.string(),
		timestamp: z.number(),
		deniedReason: z.string().nullable(),
	}),
]);

type MetricFields = z.infer<typeof MetricFields>;

export interface Logger {
	info(message: string, fields?: Fields): void;
	warn(message: string, fields?: Fields): void;
	error(message: string, fields?: Fields): void;
	flush(): Promise<void>;
}

export type LoggerOptions =
	| {
			env: 'development';
			service: string;
			namespace: string;
			dataset: string;
			requestId: string;
	  }
	| {
			env: 'production';
			service: string;
			namespace: string;
			dataset: string;
			requestId: string;
	  };

export class Logger implements Logger {
	private baselime?: BaselimeLogger;
	private opts: LoggerOptions;
	public readonly defaultFields: Fields = {};

	constructor(opts: LoggerOptions, defaultFields: Fields = {}) {
		this.opts = opts;

		this.defaultFields = {
			service: opts.service,
			namespace: opts.namespace,
			dataset: opts.dataset,
			requestId: opts.requestId,
			...defaultFields,
		};
	}

	private log(message: string, fields?: Fields) {
		const level = fields?.level || 'info';
		const logFn = level === 'info' || level === 'warn' || level === 'error' ? console[level] : console.info;

		const f = { ...this.defaultFields, ...fields };

		if (Object.keys(f).length === 0) {
			logFn(message);
		}

		logFn(message, JSON.stringify(f));

		if (this.opts.env === 'production' && this.baselime) {
			this.baselime.log(message, f);
		}
	}

	info(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'info',
			type: 'log',
			...fields,
		});
	}

	warn(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'warn',
			type: 'log',
			...fields,
		});
	}

	error(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'error',
			type: 'log',
			...fields,
		});
	}

	metric(message: string, metricFields: MetricFields, fields?: Fields): void {
		this.log(message, {
			level: 'info',
			type: 'metric',
			...fields,
			metric: metricFields,
		});
	}

	async flush(): Promise<void> {
		if (this.baselime) {
			await this.baselime.flush().catch((err) => {
				console.error('Could not flush logs to baselime', err);
			});
		}
	}
}
