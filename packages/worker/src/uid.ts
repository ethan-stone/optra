import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 26);

type Prefix = 'client' | 'api' | 'client_secret' | 'ws' | 'req' | 'client_scope' | 'api_scope';

export function uid(prefix: Prefix): string {
	return `${prefix}_${nanoid()}`;
}
