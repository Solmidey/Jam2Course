# Jam2Course

Jam2Course is a Cloudflare Worker that converts a Nullshot Jam thread into a 60-minute micro-course complete with checkpoints and a quiz. It exposes Model Context Protocol (MCP) tools, a printable preview page, and caching backed by Durable Objects.

## Features

- **MCP tools** for course outlines, checkpoints, and quizzes (`/sse` and `/ws` endpoints).
- **Deterministic generation** via heuristic summarisation when `DETERMINISTIC=true`.
- **Durable Object cache** for preview bundles with configurable TTL and size limit.
- **Printable preview UI** rendered server-side with Tailwind CDN.
- **Health endpoint** for monitoring.
- **JSON Schema emission** for all public contracts.

## Getting started

### Prerequisites

- Node.js 20+
- Yarn 4 (via Corepack) or pnpm 8+
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
yarn install
# or pnpm install
```

### Configuration

Create a `.env` (or use Wrangler secrets) with optional overrides:

```bash
DETERMINISTIC=true
REQUIRE_AUTH=false
CACHE_LIMIT=32
CACHE_TTL_SECONDS=86400
```

### Development

```bash
yarn dev
```

This starts the worker locally. Visit `http://localhost:8787/health` for a readiness check.

### Preview endpoint

```bash
curl "http://localhost:8787/preview?thread=https://example.com/thread&minutes=60&questions=10"
```

### MCP access

Jam2Course exposes Remote MCP transports:

- Server-Sent Events: `GET /sse`
- WebSocket: `GET /ws`

When `REQUIRE_AUTH=true`, include `Authorization: Bearer <token>`.

### Testing

```bash
yarn test
```

### Type checking & linting

```bash
yarn typecheck
yarn lint
```

### Deploy

```bash
yarn deploy
```

### Schema generation

```bash
yarn schema
```

Generated schemas are written to `./schemas`.

## Project structure

```
├── src
│   ├── index.ts              # Worker entry & routing
│   ├── env.ts                # Binding types
│   ├── mcp                   # MCP server, tools, and types
│   ├── routes/preview.ts     # Preview bundle resolver & renderer
│   ├── services              # Summaries, quiz, checkpoints, jam fetcher
│   └── util                  # Text & time helpers
├── test                      # Vitest suites & fixtures
├── scripts/generate-schemas.ts
├── wrangler.toml
└── README.md
```

## MCP tool summary

| Tool | Description | Input | Output |
| ---- | ----------- | ----- | ------ |
| `outline_from_thread` | Build a timed outline from a Jam thread | `{ threadUrl, targetMinutes? }` | `CourseOutline` |
| `checkpoint_tasks` | Map outline modules to Do/Reflect/Apply checkpoints | `CourseOutline` | `CheckpointPlan` |
| `quiz_gen` | Generate quiz questions tied to module key points | `{ outline, questions?, difficulty? }` | `Quiz` |

## Remote MCP integration example

```
# Example MCP client configuration snippet
{
  "servers": [
    {
      "name": "Jam2Course",
      "sse_url": "https://<your-worker>/sse",
      "websocket_url": "wss://<your-worker>/ws",
      "auth": {
        "type": "bearer",
        "token": "<optional-token>"
      }
    }
  ]
}
```

## License

MIT
