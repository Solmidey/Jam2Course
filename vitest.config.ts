import { defineConfig } from 'vitest/config';
import cloudflare from '@cloudflare/vitest-pool-workers/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'cloudflare',
    pool: cloudflare(),
    setupFiles: [],
  },
});
