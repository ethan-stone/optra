import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		include: ['**/*.test.ts'],
		maxConcurrency: 1,
		testTimeout: 10000,
		watch: false,
	},
	resolve: {
		alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
	},
});
