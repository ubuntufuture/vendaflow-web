import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['venda-web/test/**/*.test.ts'] } });
