# pulsardev

Know if your product is working. Before you need a data team.

Pulsar watches your users and delivers a plain-English weekly analysis to your inbox — comeback rate, activation patterns, friction signals, and what to investigate next. No dashboards. No setup. No data team.

## Install

```bash
npm install pulsardev
```

## Usage

```typescript
import { Pulsar } from "pulsardev";

Pulsar.init({
  projectKey: "your-project-key",
});
```

Add this to your app's entry point. Pulsar autocaptures page views, clicks, scroll depth, rage clicks, form submissions, session duration, and tab focus — automatically filtered for signal.

## Options

```typescript
Pulsar.init({
  projectKey: "your-project-key", // required
  debug: true, // log events to console
  ignoreMe: true, // exclude your own device from tracking
});
```

## Get a project key

During beta, reach out directly to get your project key and start receiving your weekly Pulse.

## What gets tracked

- Page views and SPA navigation
- Clicks on labeled elements
- Scroll depth milestones (25%, 50%, 75%, 100%)
- Rage clicks — repeated frustrated clicks on the same element
- Form submissions
- Session duration
- Tab focus and blur

## What gets filtered

- Localhost and internal IP traffic
- Bot sessions
- Bounces under 5 seconds
- Unlabeled noise clicks
- Your own visits when `ignoreMe: true`

## License

MIT
