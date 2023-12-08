import { MiddlewareHandler } from 'hono';
import { HonoEnv } from '@/app';

/**
 * A custom hono middleware that validates the jwt in the
 * Authorization header belongs to a root client.
 * @param c
 * @param next
 */
const rootAuthorizer: MiddlewareHandler<HonoEnv> = async (c, next) => {};

/**
 * A custom hono middleware that validates the jwt in the
 * Authorization header belongs to a basic client.
 * @param c
 * @param next
 */
const basicAuthorizer: MiddlewareHandler<HonoEnv> = async (c, next) => {};
