# Jam2Course

Jam2Course converts Nullshot Jam threads into a 60-minute micro-course with checkpoints and a quiz. It exposes deterministic MCP tools and a tiny preview UI designed for Cloudflare Workers.

## Features

- **MCP tools** for outline generation, checkpoint planning, and quiz authoring
- **Preview route** (`/preview`) that renders learning outcomes, modules, checkpoints, and quiz in Tailwind-styled HTML
- **Durable Object cache** with TTL to reuse generated courses
- **Deterministic mode** for CI using heuristic summarisation
- **Remote MCP endpoints** (`/mcp`, `/sse`, `/ws`) with optional bearer token auth

## Getting started

### Prerequisites

- Node.js 20+
- Yarn (recommended)
- Cloudflare Wrangler CLI (`yarn dlx wrangler --version` to confirm)

### Installation

```bash
yarn install
```

### Configuration

Copy `.env.example` (see below) and adjust values as needed:

```
DETERMINISTIC=true
REQUIRE_AUTH=false
CACHE_CAPACITY=64
CACHE_TTL_SECONDS=86400
```

These map to Wrangler `vars` for the worker. Set `REQUIRE_AUTH=true` to enforce `Authorization: Bearer <token>` on MCP endpoints.

### Local development

Start the worker and Durable Object locally:

```bash
yarn dev
```

Wrangler exposes the worker at `http://127.0.0.1:8787`. Useful routes:

- `GET /health` – readiness probe
- `GET /preview?thread=<url>` – render course preview (uses cached results when available)
- `POST /mcp` – lightweight JSON-RPC endpoint for invoking MCP tools in-process

### Testing

```bash
yarn test
```

The test suite covers MCP tool constraints and preview rendering using deterministic fixtures.

### Linting & type-checking

```bash
yarn lint
yarn typecheck
```

### Generating JSON Schemas

```bash
yarn schema
```

Schemas are emitted to the `schemas/` directory from the shared Zod definitions.

### Deployment

Ensure Wrangler is authenticated and then run:

```bash
yarn deploy
```

### MCP usage

The worker registers the following MCP tools:

- `outline_from_thread(threadUrl, targetMinutes=60)`
- `checkpoint_tasks(outline)`
- `quiz_gen(outline, questions=10, difficulty="med")`

To call them programmatically, use JSON-RPC via `POST /mcp`:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://127.0.0.1:8787/mcp \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "outline_from_thread",
    "params": {
      "threadUrl": "https://example.com/thread.json",
      "targetMinutes": 60
    }
  }'
```

The response contains the structured outline JSON. Follow up with `checkpoint_tasks` and `quiz_gen` using the returned outline.

### Remote MCP clients

Jam2Course exposes:

- `GET /sse` – placeholder SSE endpoint for discovery
- `GET /ws` – placeholder WebSocket bridge (non-interactive)

For current clients, use the JSON-RPC endpoint (`/mcp`). Future versions can extend the SSE/WebSocket bridges for full protocol compliance.

### Preview example

```bash
curl "http://127.0.0.1:8787/preview?thread=https://example.com/thread.json&minutes=60&questions=10"
```

This returns HTML with the course summary, checkpoints, and quiz. Ideal for embedding in a static site or sharing with stakeholders.

## Project structure

```
src/
  index.ts              # Worker entrypoint
  mcp/                  # MCP definitions and server wiring
  routes/               # Preview & health routes
  services/             # Jam fetcher, summariser, quiz, checkpoints
  util/                 # Text/time helpers
scripts/
  generate-schemas.ts   # Export Zod schemas to JSON
```

## License

MIT
