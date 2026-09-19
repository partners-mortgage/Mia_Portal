# Cloudflare AI gateway, contract and usage

Partners Mortgage internal reference
September 18, 2026

Answers the question: what is the repository or API documentation for the existing Cloudflare AI gateway, so Ask Mia can be connected without exposing credentials.

---

## What it is

Not a public repository and not a documented API. It is a single internal Cloudflare Worker (`worker.js`) living in the Partners Mortgage Cloudflare account. Its only job is to hold provider API keys server side so that no key ever appears in browser code.

There is nothing to link to, so the contract is written out below.

**Background on why it exists:** API keys were scraped three times out of embedded HTML files before the gateway was introduced. Every external AI call from every Partners Mortgage browser tool now routes through it. This is a standing architectural rule, not a preference.

---

## Base URL

```
https://pm-gateway.<account>.workers.dev
```

**Confirm before building against it.** The project instructions still carry this URL as a placeholder with a note to update it once the worker is deployed. It may not be live yet. Call `GET /health` first, and if it does not respond, check with Leif Boyd on deployment status rather than assuming the endpoint exists.

---

## Routes

| Route | Purpose |
| --- | --- |
| `POST /anthropic` | Proxies to the Anthropic Messages API |
| `POST /openai` | Proxies to OpenAI, reserved for future use |
| `GET /health` | Returns `{"status":"ok"}`. Use to confirm the worker is live. |

---

## Request shape

Post the provider's normal request body. Send no authentication headers of any kind. The worker injects the key, the version header and anything else the provider requires.

```javascript
var response = await fetch('https://pm-gateway.<account>.workers.dev/anthropic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
    // No x-api-key. The worker adds it.
    // No anthropic-version. The worker adds it.
    // No anthropic-dangerous-direct-browser-access. Not needed.
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: 'System prompt here.',
    messages: [{ role: 'user', content: 'User message.' }]
  })
});
```

Never call `https://api.anthropic.com` directly from browser code, and never place a key in any HTML or JavaScript file.

---

## Key management

- Keys are stored as encrypted Cloudflare secrets, set with `wrangler secret put KEY_NAME`.
- Rotation: revoke the old key at the provider, generate a new one, run `wrangler secret put ANTHROPIC_KEY`. Every application picks up the change with no redeploy.
- A monthly spend cap should be set at the provider console. Billing alerts alone do not stop spending.

---

## Origin allowlist

The worker enforces an `ALLOWED_ORIGINS` list. Currently:

- `partnersmortgage.com`
- `flyers.partnersmortgage.com`
- `leifaboyd-pm.github.io`
- `localhost`, `127.0.0.1`, `file://`

**Action required for Mia.** Any new domain serving Ask Mia must be added to `ALLOWED_ORIGINS` in `worker.js`, followed by `wrangler deploy`, or requests will fail CORS. Raise this with Leif before deploying to a new host.

---

## Scope boundary, important

The gateway is for browser tools making conversational calls. It is **not** the right path for document extraction.

Conditions parsing and income extraction need a server side worker with schema validation, bounded retries, job records, page and token quotas, idempotency and a dead letter queue. They also require an approved vendor, endpoint, region and retention arrangement before any real document is processed.

Use the gateway for conversational Ask Mia. Do not route approval PDFs, pay stubs, tax documents or income evidence through it.

---

## Interim approach while the gateway is unconfirmed

Build Ask Mia against this contract but keep its responses clearly labeled as local test output rather than presenting them as live AI. This matches the labeling discipline used throughout the milestone one build, where simulated and unimplemented capabilities are shown with a stated reason rather than hidden.

---

## Note on the three gaps identified

The gaps found beneath the finished screens are accurate and are milestone one fixture behavior, listed on the build status page as not implemented rather than defects:

1. **Ask Mia has no handlers.** Expected. The conversational layer was not part of milestone one.
2. **Staff and borrower checklists use different data.** Expected. The two files carry independent fixtures because there is no shared backend yet. They converge when the database exists.
3. **Income figures are hardcoded examples.** Expected. They are the arithmetic acceptance fixtures from the specification, present to prove the calculation and blocking rules, not to compute live income.

**One of these is worth fixing early.** The approved snapshot storing a count rather than the actual checklist is a real modeling problem, not just a fixture shortcut. The entire release model depends on an immutable snapshot with optimistic concurrency: a queued message must be validated against the exact checklist it was approved from, and a superseded version must be detectable. A count cannot support either. Store the full condition set, wording, audience and scope at approval time before building anything that queues or dispatches messages.
