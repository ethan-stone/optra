import { Axiom } from '@axiomhq/js';

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
	  }
	| {
			env: 'production';
			axiomToken: string;
			axiomDataset: string;
			axiomOrgId: string;
	  };

export class Logger implements Logger {
	private axiom?: Axiom;
	private opts: LoggerOptions;

	constructor(opts: LoggerOptions) {
		this.opts = opts;

		if (this.opts.env === 'production') {
			this.axiom = new Axiom({
				token: this.opts.axiomToken,
				orgId: this.opts.axiomOrgId,
			});
		}
	}

	private log(message: string, fields?: Fields) {
		const level = fields?.level || 'info';
		const logFn = level === 'info' || level === 'warn' || level === 'error' ? console[level] : console.info;

		const f = { ...fields };

		if (Object.keys(f).length === 0) {
			logFn(message);
		}

		logFn(message, JSON.stringify(f));

		if (this.opts.env === 'production' && this.axiom) {
			this.axiom.ingest(this.opts.axiomDataset, [
				{
					message,
					...f,
				},
			]);
		}
	}

	info(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'info',
			_time: Date.now(),
			...fields,
		});
	}

	warn(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'warn',
			_time: Date.now(),
			...fields,
		});
	}

	error(message: string, fields?: Fields): void {
		this.log(message, {
			level: 'error',
			_time: Date.now(),
			...fields,
		});
	}

	async flush(): Promise<void> {
		if (this.axiom) {
			await this.axiom.flush().catch((err) => {
				console.error('Could not flush logs to axiom', err);
			});
		}
	}
}
