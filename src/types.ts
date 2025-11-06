import type { DurableObjectNamespace } from '@cloudflare/workers-types';

export interface Env {
  CourseCacheDO: DurableObjectNamespace;
  REQUIRE_AUTH?: string;
  DETERMINISTIC?: string;
  CACHE_LIMIT?: string;
  CACHE_TTL_SECONDS?: string;
  AUTH_TOKEN?: string;
}
