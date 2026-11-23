# Pulsar

Know if your product is working. Before you need a data team.

Pulsar is a lightweight analytics SDK for early-stage products. Drop in one script and, instead of a dashboard, the founder gets a short weekly email in plain English: comeback rate, where users get stuck, and what to look at next.

## How it works

```
Browser SDK ──► Ingest API ──► Postgres ──► Weekly snapshot ──► Signal detectors ──► Insight ──► Email
 (pulsardev)    (Hono, zod)    (Prisma)     (per project)       (deterministic)     (LLM + check)  (Resend)
```

1. **Capture.** The SDK autocaptures page views, clicks, rage and dead clicks, scroll depth, form submits and session lifecycle, batches them, and sends them to the API. It never records form values or copied text.
2. **Ingest.** Each batch is validated with zod, checked against the project's registered domain, filtered for noise and bots, and stored.
3. **Snapshot.** A scheduler captures a weekly snapshot per project at the owner's chosen day and hour.
4. **Detect.** A set of independent detectors (`retention`, `friction`, `funnel`, `dead-click`, `trends`, `intent`, `device`, `referrer`, `winner`) each return evidence-backed signals against explicit thresholds. Signals are ranked and correlated (for example, a comeback-rate drop plus rage clicks on the activation page).
5. **Write.** The top signal's facts, one interpretation and one recommended action are passed to Claude, which only rewrites them as three sentences.
6. **Verify.** The output is checked before it's sent: every number in it must appear in the source facts. If the model invents a statistic, or the call fails, Pulsar falls back to a rule-based insight.

## Design decisions

**The model never does the analysis.** All detection and maths is deterministic and unit tested. The LLM is a copywriter with a fixed brief and no room to infer, and `verifyInsight` rejects any output containing a number that isn't in the facts it was given. A wrong insight is worse than a plain one.

**Two keys per project.** The `projectKey` is public; it ships in the SDK and can only write events, and only from the registered domain. A separate `secretKey`, shown once at registration, is required to read stats or trigger a digest, and digests only ever go to the email on file.

**Privacy by default.** Clicks are labelled from `aria-label`, `data-pulsar`, `id`, link `href` or button text. Form submits record the form's id and action, not its fields. Copy events record only the selection length.

## Packages

- [`packages/sdk`](packages/sdk): `pulsardev` on npm. TypeScript, zero runtime dependencies.
- [`packages/api`](packages/api): ingest, analytics, scheduler and digest API.

## Stack

- **SDK:** TypeScript, tsup
- **API:** Bun, Hono, zod, Prisma, PostgreSQL (Neon), node-cron
- **AI:** Claude (Anthropic SDK), with output verification and a rule-based fallback
- **Email:** Resend
- **Tests:** Bun test, happy-dom

## Development

```bash
bun install

# API (copy packages/api/.env.example to packages/api/.env first)
bun run dev:api

# SDK
bun run build

# Tests
bun run test
```

Dev scripts in `packages/api/src/scripts/dev` seed realistic scenarios (a broken signup form, a recovery week, early-stage traffic, multi-week trends) so each detector and digest path can be exercised end to end.

## Status

Built and run as a private beta in 2026.
