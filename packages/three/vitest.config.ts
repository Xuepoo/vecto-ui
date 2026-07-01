import { defineConfig } from 'vitest/config';

// Resolve @vectojs/core to its source so tests run against the monorepo source.
export default defineConfig({
  resolve: {
    alias: {
      '@vectojs/core': new URL('../core/src/index.ts', import.meta.url).pathname,
    },
  },
});
