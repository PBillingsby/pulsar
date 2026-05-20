# pulsar-sdk

Autocapture analytics SDK for early stage products.

## Install

```bash
npm install pulsar-sdk
```

## Usage

```typescript
import { Pulsar } from 'pulsar-sdk'

Pulsar.init({
  projectKey: 'your-project-key',
  debug: true // remove in production
})
```

That's it. Pulsar automatically captures:

- Page views
- Clicks with element labels
- SPA route changes
- Session data

## Options

| Option | Type | Required | Default |
|--------|------|----------|---------|
| projectKey | string | yes | — |
| debug | boolean | no | false |
| endpoint | string | no | https://api.pulsar.dev/events |