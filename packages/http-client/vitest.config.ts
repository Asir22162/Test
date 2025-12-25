import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    deps: {
      inline: ['nock']
    }
  },
  optimizeDeps: {
    include: ['nock']
  },
  ssr: {
    noExternal: ['nock']
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});