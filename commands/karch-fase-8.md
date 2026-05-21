# karch-fase-8 — Production Monitoring

## Purpose
Configure production observability: Sentry DSN, performance tracing, alerts and incident runbook. Pino logging and the health endpoint were scaffolded in Phase 5 and verified in Phase 7 — here they connect to external systems and operational procedures are defined.

## Prior context required
- Phase 7 testing complete (health endpoint verified)
- Sentry project created and DSN available (`SENTRY_DSN` env var)
- Alert channels defined (Slack workspace, PagerDuty, or equivalent)

## What already exists (from Phase 5)
| Component | Status |
|-----------|--------|
| `/api/health` | Implemented and tested in Phase 7 |
| Pino (structured JSON logging) | Configured and running |
| `pg_stat_statements` | Enabled in DB |

## Steps

### 1. Configure Sentry
```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.prismaIntegration()],
})
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
```

### 2. Add `SENTRY_DSN` to `.env.example`
```bash
SENTRY_DSN=https://...@sentry.io/...
```

### 3. Configure alerts
Set up in Sentry (or equivalent) with these thresholds:
```
Error rate > 1% (last 5 min)     → Slack #alerts + email on-call
Latency p95 > 2s                  → Slack #alerts
Health check fails × 3 in a row   → PagerDuty / escalation
Slow query detected (> 500ms)     → Slack #db-alerts
```

### 4. Write the incident runbook
Create `docs/runbook.md` with:
```markdown
# Incident Runbook

## 1. Identify the error in Sentry
- Go to [Sentry project URL]
- Filter by environment: production
- Look for error spikes in the last 15 min

## 2. Correlate with Pino logs
- Filter logs by `traceId` from the Sentry event
- In Vercel: Runtime Logs → filter by request ID

## 3. Force a deployment rollback in Vercel
- Vercel dashboard → Deployments → previous deployment → Redeploy
- Or: `git revert <commit> && git push origin main`

## 4. Emergency migration
- Connect to production DB (readonly first to diagnose)
- If data fix needed: coordinate with team lead before executing

## 5. Escalation
- Who to contact: [name / Slack handle]
- When to escalate: after 15 min without resolution
- Bridge channel: #incident-YYYY-MM-DD
```

### 5. Create monitoring plan
Document in `docs/monitoring-plan.md`:
- All configured components and their DSNs/URLs
- Alert thresholds and their rationale
- Dashboard links
- On-call rotation (if applicable)

## Artifacts produced
| File | Description |
|------|-------------|
| `docs/monitoring-plan.md` | Components, thresholds and procedures |
| `docs/runbook.md` | Operational procedures: deploy, debug, rollback |
| `sentry.server.config.ts` | Sentry config for server |
| `sentry.client.config.ts` | Sentry config for client |

## Gate
**Conditional gate:**

- **Configuration complete** (Sentry DSN active, alerts configured, runbook documented): advance automatically → *"Production monitoring ready. Sentry connected, alerts active, runbook at `docs/runbook.md`. Advancing to Phase 9."*
- **Pending decision** (alert threshold ambiguous, notification channel not defined, escalation not specified): stop and ask → *"Which Slack channel should critical alerts go to? Who is responsible for escalation?"*

## Error signals
- `SENTRY_DSN` not in `.env.example`: add it before proceeding
- Runbook missing rollback procedure: complete it — this is critical for incident response
- Alert thresholds not defined: ask the human, do not guess operational decisions
