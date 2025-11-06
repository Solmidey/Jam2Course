export interface Env {
  COURSE_CACHE: DurableObjectNamespace;
  DETERMINISTIC?: string;
  REQUIRE_AUTH?: string;
  CACHE_LIMIT?: string;
  CACHE_TTL_SECONDS?: string;
}
