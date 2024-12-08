import { env } from "@/env";
import { uid } from "@optra/core/uid";

export type Fields = Record<string, unknown>;

export interface ILogger {
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
  flush(): Promise<void>;
}

export type LoggerOptions =
  | {
      env: "development";
      service: string;
      namespace: string;
      dataset: string;
      requestId: string;
    }
  | {
      env: "production";
      service: string;
      namespace: string;
      dataset: string;
      requestId: string;
    };

export class Logger implements Logger {
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
    const level = fields?.level || "info";
    const logFn =
      level === "info" || level === "warn" || level === "error"
        ? console[level]
        : console.info;

    const f = { ...this.defaultFields, ...fields };

    if (Object.keys(f).length === 0) {
      logFn(message);
    }

    logFn(message, JSON.stringify(f));
  }

  info(message: string, fields?: Fields): void {
    this.log(message, {
      level: "info",
      type: "log",
      timestamp: Date.now(),
      ...fields,
    });
  }

  warn(message: string, fields?: Fields): void {
    this.log(message, {
      level: "warn",
      type: "log",
      timestamp: Date.now(),
      ...fields,
    });
  }

  error(message: string, fields?: Fields): void {
    this.log(message, {
      level: "error",
      type: "log",
      timestamp: Date.now(),
      ...fields,
    });
  }
}

export const loggerConfig: Omit<LoggerOptions, "requestId" | "namespace"> = {
  env:
    env.NODE_ENV === "development" || env.NODE_ENV === "test"
      ? "development"
      : "production",
  service: "web",
  dataset: "optra-web",
};

export function newLogger(
  opts: Omit<LoggerOptions, "env" | "dataset" | "service" | "requestId">,
  defaultFields: Fields = {},
) {
  return new Logger(
    { ...loggerConfig, ...opts, requestId: uid("req") },
    defaultFields,
  );
}
