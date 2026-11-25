import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', globals: true, setupFiles: ['packages/ui/tests/setup.ts'], include: ['packages/ui/tests/**/*.test.tsx'] } });
