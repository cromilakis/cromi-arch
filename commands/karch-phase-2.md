# karch-phase-2 — Risk Analysis

## Purpose
Identify security, data, performance and compliance risks **before** designing the architecture. Catching risks here prevents expensive redesigns in Phase 5.

## Prior context required
- `specs/NNN-feature/spec.md` from Phase 1
- Existing data model (if any) in `prisma/schema.prisma`

## Steps

### Security — Threat Modeling (OWASP Top 10)

For each user-facing input or API endpoint in the spec, evaluate:

| Threat | Question to answer |
|--------|-------------------|
| Broken Object Level Auth (BOLA) | Can user A access user B's resources? |
| Broken Authentication | Are sessions/tokens handled correctly? |
| Injection | Are all inputs validated with Zod before use? |
| Security Misconfiguration | Are headers, CORS, env vars correctly configured? |
| Mass Assignment | Are Zod schemas strict (no passthrough)? |
| Rate limiting | Are public/sensitive endpoints protected? |
| Sensitive Data Exposure | Is PII logged, stored unencrypted, or leaked in errors? |

Document each finding with: **threat** / **likelihood** / **mitigation**.

### Data Analysis

1. Design the Entity-Relationship model for the feature
2. Identify required indexes (foreign keys, query filters, unique constraints)
3. Flag potential N+1 queries and where `include` or pagination is needed
4. Check if existing migrations need to be updated (expand-contract pattern)
5. Identify if any field contains PII → flag for GDPR/privacy treatment

### Performance

- Identify queries that may be slow at scale (full table scans, no indexes)
- Decide if any response needs caching (TanStack Query staleTime, Redis)
- Estimate expected load and whether rate limiting thresholds need adjustment

### Compliance

- Does the feature handle personal data? → apply GDPR patterns (see `privacy.md`)
- Does it involve payments? → Stripe + PCI scope considerations
- Does it require audit logging? → flag for implementation in Phase 5

## Artifacts produced
| File | Description |
|------|-------------|
| `docs/threat-model.md` | Threat analysis with mitigations per endpoint |
| `docs/data-analysis.md` | ER model, indexes, N+1 analysis, PII inventory |

## Gate
**Conditional gate:**

- **No blockers** (all risks have clear mitigations, no compliance decisions pending): advance automatically → *"Risk analysis complete. No blockers. Advancing to Phase 3 — review `docs/threat-model.md` whenever you want."*
- **Blocker found** (high risk without clear mitigation, compliance decision required, scope change needed): stop and present the blocker → *"Blocker in risk analysis: [description]. Options: [A] / [B]. How should we proceed?"*

A blocker is a risk the agent **cannot resolve alone** — it requires a business decision or context only the human has.

## Error signals
- Schema change breaks existing queries: document as blocker, do not proceed
- GDPR-sensitive field found without anonymization plan: document as blocker
- More than 3 high-risk threats without mitigations: stop and present all to human before continuing
