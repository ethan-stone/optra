import { Axiom } from '@axiomhq/js';
import { BaselimeLogger } from '@baselime/edge-logger';

export type Fields = {
	[key: string]: unknown;
};

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
			baseLimeApiKey: string;
			executionCtx: ExecutionContext;
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

		if (this.opts.env === 'production') {
			this.baselime = new BaselimeLogger({
				apiKey: this.opts.baseLimeApiKey,
				ctx: this.opts.executionCtx,
				service: this.opts.service,
				namespace: this.opts.namespace,
				dataset: this.opts.dataset,
				requestId: this.opts.requestId,
			});
		}
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
			time: Date.now(),
			...fields,
		});
	}

	warn(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'warn',
			time: Date.now(),
			...fields,
		});
	}

	error(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'error',
			time: Date.now(),
			...fields,
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
