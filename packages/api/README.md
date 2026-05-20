# pulsar-api

Ingest and analytics API for Pulsar.

## Development

```bash
bun install
bun run dev
```

## Environment

```bash
DATABASE_URL="your-neon-connection-string"
```

## Endpoints

`POST /events` — ingest events from the SDK

`GET /health` — health check