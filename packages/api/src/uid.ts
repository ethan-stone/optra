import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('2346789abcdefghijkmnpqrtwxyzABCDEFGHJKLMNPQRTUVWXYZ', 26);

type Prefix = 'client' | 'api' | 'client_secret' | 'ws' | 'req' | 'client_scope' | 'api_scope' | 'signing_secret';

export function uid(prefix?: Prefix, length: number = 21): string {
	return prefix ? `${prefix}_${nanoid(length)}` : nanoid(length);
}
