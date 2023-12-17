import { Context } from 'hono';
import { HTTPException as HonoHTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { generateErrorMessage } from 'zod-error';

const ErrorReason = z.enum([
	'BAD_JWT',
	'INVALID_SIGNATURE',
	'EXPIRED',
	'RATELIMIT_EXCEEDED',
	'SECRET_EXPIRED',
	'VERSION_MISMATCH',
	'NOT_FOUND',
	'BAD_REQUEST',
	'FORBIDDEN',
	'INTERNAL_SERVER_ERROR',
]);

export function createErrorSchema(reasons: [z.infer<typeof ErrorReason>, ...z.infer<typeof ErrorReason>[]]) {
	return z.object({
		reason: z.enum(reasons).openapi({
			example: reasons[0],
			description: 'A string that can be used programatically to determine the type of error',
		}),
		message: z.string().openapi({
			description: 'A human-readable message for the error',
		}),
	});
}

export const errorResponseSchemas = {
	400: {
		description: 'Bad Request',
		content: {
			'application/json': {
				schema: createErrorSchema(['BAD_REQUEST']).openapi('ErrorBadRequest'),
			},
		},
	},
	401: {
		description: 'Unauthorized',
		content: {
			'application/json': {
				schema: createErrorSchema(['BAD_JWT', 'EXPIRED', 'INVALID_SIGNATURE', 'SECRET_EXPIRED', 'VERSION_MISMATCH']).openapi(
					'ErrorUnauthorized'
				),
			},
		},
	},
	403: {
		description: 'Forbidden',
		content: {
			'application/json': {
				schema: createErrorSchema(['FORBIDDEN']).openapi('ErrorForbidden'),
			},
		},
	},
	404: {
		description: 'Not Found',
		content: {
			'application/json': {
				schema: createErrorSchema(['NOT_FOUND']).openapi('ErrorNotFound'),
			},
		},
	},
	429: {
		description: 'Too many requests',
		content: {
			'application/json': {
				schema: createErrorSchema(['RATELIMIT_EXCEEDED']).openapi('ErrorTooManyRequests'),
			},
		},
	},
	500: {
		description: 'Internal Server Error',
		content: {
			'application/json': {
				schema: createErrorSchema(['INTERNAL_SERVER_ERROR']).openapi('ErrorInternalServerError'),
			},
		},
	},
};

// TODO: handle errors
// https://github.com/unkeyed/unkey/blob/main/apps/api/src/pkg/errors/http.ts

export const ErrorSchema = z.object({
	reason: ErrorReason.openapi({
		example: 'INTERNAL_SERVER_ERROR',
		description: 'A string that can be used programatically to determine the type of error',
	}),
	message: z.string().openapi({
		description: 'A human-readable message for the error',
	}),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;

function reasonToStatus(reason: z.infer<typeof ErrorReason>) {
	switch (reason) {
		case 'BAD_JWT':
		case 'INVALID_SIGNATURE':
		case 'EXPIRED':
		case 'SECRET_EXPIRED':
		case 'VERSION_MISMATCH':
			return 401;
		case 'RATELIMIT_EXCEEDED':
			return 429;
		case 'NOT_FOUND':
			return 404;
		case 'BAD_REQUEST':
			return 400;
		case 'FORBIDDEN':
			return 403;
		case 'INTERNAL_SERVER_ERROR':
			return 500;
	}
}

export class HTTPException extends HonoHTTPException {
	public readonly reason: z.infer<typeof ErrorReason>;

	constructor(args: { reason: z.infer<typeof ErrorReason>; message: string }) {
		super(reasonToStatus(args.reason), { message: args.message });
		this.reason = args.reason;
	}
}

export function handleZodError(parseResult: { success: true; data: any } | { success: false; error: z.ZodError }, ctx: Context) {
	if (!parseResult.success) {
		return ctx.json<ErrorResponse>(
			{
				reason: 'BAD_REQUEST',
				message: generateErrorMessage(parseResult.error.issues),
			},
			400
		);
	}
}

export function handleError(err: Error, ctx: Context): Response {
	if (err instanceof HTTPException) {
		return ctx.json<ErrorResponse>(
			{
				reason: err.reason,
				message: err.message,
			},
			err.status
		);
	}

	console.error(err);

	return ctx.json<ErrorResponse>(
		{
			reason: 'INTERNAL_SERVER_ERROR',
			message: 'An internal server error occurred',
		},
		500
	);
}
