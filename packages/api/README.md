# pulsar-api

Ingest, analytics and digest API for Pulsar.

## Development

```bash
bun install
cp .env.example .env
bunx prisma migrate dev
bun run dev
```

See `.env.example` for all environment variables.

## Endpoints

| Method | Path                       | Auth                                    | Purpose                                                                                  |
| ------ | -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/health`                  | none                                    | Health check                                                                             |
| `POST` | `/events`                  | public `projectKey` + registered origin | Ingest a batch of up to 100 events from the SDK. All events must share one `projectKey`. |
| `POST` | `/projects/validate-code`  | none                                    | Check a beta code                                                                        |
| `POST` | `/projects/register`       | beta code                               | Create a project. Returns the public `projectKey` and a private `secretKey`, shown once. |
| `POST` | `/projects/delete-request` | `projectKey` + owner email              | Email a single-use deletion link (24h expiry)                                            |
| `POST` | `/projects/delete-confirm` | deletion token                          | Soft-delete the project                                                                  |
| `GET`  | `/stats/:projectKey`       | `Authorization: Bearer <secretKey>`     | Current stats                                                                            |
| `POST` | `/digest/:projectKey`      | `Authorization: Bearer <secretKey>`     | Build and send a digest to the email on file. Limited to 3 per project per hour.         |

## Rate limits

- Ingest: 1000 requests per minute per IP
- Registration: 5 per hour per IP
- Manual digests: 3 per hour per project

Client IPs come from the socket by default. Set `TRUST_PROXY=true` only when running behind a proxy that overwrites `X-Forwarded-For`, such as Railway, Fly or Cloudflare.
