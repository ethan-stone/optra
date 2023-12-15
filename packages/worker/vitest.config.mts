import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		include: ['**/*.test.ts'],
		watch: false,
	},
	resolve: {
		alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
	},
});
