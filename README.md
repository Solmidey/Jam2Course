# Jam2Course

Jam2Course converts Nullshot Jam discussion threads into focused 60-minute learning experiences. The worker exposes MCP tools for automation and a tiny HTML preview for quick reviews.

## Features

- **Model Context Protocol server** with three tools: outline generation, checkpoint planning, and quiz authoring.
- **Cloudflare Worker + Durable Object cache** to memoize generated courses.
- **Deterministic local mode**: tests use heuristic summaries instead of external LLM calls.
- **Preview UI** at `/preview` that renders a printable course snapshot.
- **JSON Schemas** emitted for all contracts.

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn 4 (or enable Corepack) – `corepack enable`
- Cloudflare Wrangler CLI – `npm install -g wrangler`

### Installation

```bash
yarn install
```

Create a `.env` (or `wrangler.toml` vars) if you need to override defaults:

```
REQUIRE_AUTH=false
DETERMINISTIC=true
CACHE_LIMIT=32
CACHE_TTL_SECONDS=86400
```

### Local Development

```bash
yarn dev
```

This starts the worker locally with persistence for the Durable Object cache.

Health check:

```bash
curl http://127.0.0.1:8787/health
```

Preview (replace `THREAD_URL` with an accessible Jam thread or fixture served locally):

```bash
curl "http://127.0.0.1:8787/preview?thread=THREAD_URL&minutes=60&questions=10"
```

### Testing & Linting

```bash
yarn lint
yarn test
```

### Generating Schemas

```bash
yarn schema
```

Schemas land in `./schemas` and can be published to API consumers.

### Deploying

```bash
yarn deploy
```

Ensure your `wrangler.toml` bindings match production requirements.

## MCP Usage

Jam2Course exposes a Remote MCP server on the same Worker:

- **Server-Sent Events**: `GET /sse`
- **WebSocket**: `GET /ws`

When `REQUIRE_AUTH=true`, requests must provide `Authorization: Bearer <token>`.

Example SSE subscription with `curl`:

```bash
curl -N http://127.0.0.1:8787/sse
```

## Preview Route Example

```bash
curl "http://127.0.0.1:8787/preview?thread=https://example.com/thread.json"
```

This will fetch or synthesize the course outline, checkpoint plan, and quiz, then render them into an HTML page.

## Project Structure

```
src/
  index.ts
  mcp/
    server.ts
    tools.ts
    types.ts
  services/
    checkpoints.ts
    jam_fetch.ts
    quiz.ts
    summarize.ts
  routes/
    preview.ts
    health.ts
  util/
    text.ts
    time.ts
```

Tests live in `test/` with fixtures under `test/fixtures/`.

## License

MIT
