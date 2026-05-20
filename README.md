# Pulsar

Know if your product is working. Before you need a data team.

Pulsar is a lightweight analytics SDK for early stage startups and hackathon projects. Install it in 2 minutes, see your comeback rate, most visited pages, and what users actually do — in plain English.

## Packages

- `packages/sdk` — JavaScript SDK for autocapturing events
- `packages/api` — Hono backend for ingesting and storing events

## Development

```bash
bun install

# Run the API
bun run dev:api

# Build the SDK
bun run build

# Run all tests
bun test --cwd packages/sdk
bun test --cwd packages/api
```

## Stack

- SDK: TypeScript, zero dependencies
- API: Hono, Prisma, PostgreSQL (Neon)
- Tests: Bun test