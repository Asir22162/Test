import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    deps: {
      inline: ['vitest', '@vitest/expect', '@vitest/snapshot', '@vitest/spy', '@vitest/utils', 'nock']
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
    environment: 'node'
  }
});