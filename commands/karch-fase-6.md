# karch-fase-6 — Security (Day 1)

## Purpose
Apply security controls before integral testing. Security is not a final step — it runs immediately after implementation so vulnerabilities never reach the testing or production phase.

## Prior context required
- Implementation from Phase 5 (all tasks complete)
- `docs/threat-model.md` from Phase 2 (mitigations to verify)

## Checklist

Run each item and document the result in `docs/security-audit.md`.

### Input Validation
- [ ] **Zod schemas on ALL API inputs** — no endpoint accepts an unvalidated body
  ```typescript
  const body = RequestSchema.parse(await req.json()) // throws ZodError if invalid
  ```
- [ ] **Strict schemas** — no `.passthrough()`, all unexpected fields rejected
- [ ] **Type coercion where needed** — use `z.coerce.number()` for URL params

### Authentication & Authorization
- [ ] **Auth check on every protected Route Handler**
  ```typescript
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- [ ] **BOLA check on every resource access** (ownership verification)
  ```typescript
  if (resource.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
  ```
- [ ] **RBAC tested** — role-based access verified for each protected operation

### Rate Limiting
- [ ] Login / Register: 5 attempts → 15-minute block per IP
- [ ] Password reset: 3 attempts → 1-hour block
- [ ] Public API: 100 req/min per IP
- [ ] Authenticated API: 1000 req/min per user

### Injection & XSS
- [ ] All DB queries through Prisma ORM — no raw SQL with string interpolation
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] No user input reflected directly in responses without encoding

### Security Headers (in `next.config.js`)
- [ ] `Content-Security-Policy` configured
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Strict-Transport-Security` (HSTS)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

### Secrets & Dependencies
- [ ] No tokens, passwords or credentials in git (check with `git log --all --full-diff -S "secret"`)
- [ ] All new env vars added to `.env.example` in this PR
- [ ] Run `npm audit --audit-level=high` → 0 high/critical vulnerabilities

### Static Analysis
```bash
npx semgrep --config=auto --error
```
- [ ] 0 issues at critical or high severity

### Logging & Data
- [ ] No PII, passwords, or tokens logged — Pino `redact` configured for sensitive fields
- [ ] Error responses do not leak stack traces or internal paths in production

## Artifacts produced
| File | Description |
|------|-------------|
| `docs/security-audit.md` | Full security audit report with results per checklist item |

## Gate
**Conditional gate:**

- **All green** (Semgrep 0 issues, `npm audit` no high/critical, all checklist items passed): advance automatically → *"Security: all green. 0 vulnerabilities. Full report in `docs/security-audit.md`. Advancing to Phase 7."*
- **Finding detected**: stop and present → *"Security finding: [description + severity]. Proposed mitigation: [X]. Approve or adjust?"*

## Error signals
- Endpoint without Zod validation: fix before proceeding, this is not optional
- `npm audit` shows critical vulnerability: fix or document explicit exception — do not ignore
- Semgrep finding that cannot be mitigated: present to human with context before proceeding
