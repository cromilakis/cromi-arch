# karch-security-check — Full Security Checklist

## Purpose
Run a comprehensive security audit on the current codebase. Use this before a major release, after a significant refactor, or on demand when security concerns arise. More thorough than the Phase 6 per-feature check — covers the entire application.

## Steps

Run every section. Document results in `docs/security-audit-full.md`.

---

### 1. Static Analysis
```bash
npx semgrep --config=auto --error
```
Expected: **0 critical or high severity issues**.

For each finding:
- Severity + rule ID
- File and line
- Proposed fix or justification if false positive

---

### 2. Dependency Audit
```bash
npm audit --audit-level=high
```
Expected: **0 high or critical vulnerabilities**.

For each finding:
- Package + version + CVE
- Whether a fix is available: `npm audit fix` or manual upgrade
- If no fix available: document as accepted risk with justification

Check for outdated packages:
```bash
npx npm-check-updates --target minor
```
Update minor/patch versions; evaluate major upgrades separately (see upgrade strategy).

---

### 3. Secret Scanning
```bash
# Check for secrets in git history
git log --all --full-diff -S "password" -S "secret" -S "token" -S "apiKey" --name-only

# Check for secrets in current working tree
grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env" \
  -E "(password|secret|token|apiKey|api_key)\s*=\s*['\"][^'\"]{8,}" . \
  --exclude-dir=node_modules --exclude-dir=.git
```
Expected: **0 secrets in code or git history**. All secrets in `.env.local` (gitignored).

Verify `.env.example` exists and documents all required variables without values.

---

### 4. Authentication & Authorization (OWASP API1, API2, API5)

**Auth check on every protected Route Handler:**
```bash
# Find Route Handlers that do NOT call auth()
grep -rL "await auth()" src/app/api/ --include="route.ts"
```
Review each result — some endpoints are intentionally public (webhooks, health). Document all public endpoints explicitly.

**BOLA check on resource endpoints:**
Every endpoint that returns a specific resource (by ID) must verify ownership:
```typescript
if (resource.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
```

**RBAC verification:**
Every admin or privileged action must check role, not just authentication.

---

### 5. Input Validation (OWASP API3)

```bash
# Find Route Handlers that parse req.json() without Zod
grep -rn "req.json()" src/app/api/ --include="route.ts" | grep -v "Schema.parse\|safeParse\|z\."
```
Every `req.json()` call must be followed by a Zod parse. No exceptions.

Verify Prisma selects are explicit — no `include: { all: true }` or unbounded `findMany`:
```bash
grep -rn "include.*all.*true\|findMany()" src/ --include="*.ts" | grep -v "where\|take\|skip"
```

---

### 6. Rate Limiting (OWASP API4)

Verify rate limiting is applied on:
- [ ] `POST /api/auth/...` — login, register, password reset (aggressive limits: 3-5/15min)
- [ ] All public `GET` endpoints (100 req/min per IP)
- [ ] All authenticated endpoints (1000 req/min per user)
- [ ] Sensitive business flows (transfer, vote, review) — per-user strict limits

```bash
grep -rL "rateLimitCheck\|rateLimit\|rateLimiter" src/app/api/ --include="route.ts"
```
Review each result — document intentional exceptions.

---

### 7. Security Headers

Verify `next.config.js` (or `next.config.ts`) includes all required headers:
```bash
grep -A 50 "headers()" next.config.*
```

Required headers:
- [ ] `Content-Security-Policy`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Strict-Transport-Security` (max-age ≥ 31536000)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy`

---

### 8. Logging & Data Exposure (OWASP API8)

```bash
# Check for console.log in production code (should use Pino)
grep -rn "console\.log\|console\.error\|console\.warn" src/ --include="*.ts" --include="*.tsx" \
  --exclude-dir="*.test.*" --exclude-dir="*.spec.*"
```

Verify Pino `redact` config covers sensitive fields:
```typescript
// src/lib/logger.ts — must include:
redact: ['password', 'token', 'secret', 'authorization', 'cookie', '*.password', '*.token']
```

Check error responses do not expose stack traces:
```bash
grep -rn "error.stack\|err.stack" src/app/api/ --include="*.ts"
```

---

### 9. GDPR / Privacy

- [ ] PII fields identified in Prisma schema (email, name, phone, address)
- [ ] Soft delete uses `deletedAt` — GDPR erasure uses `anonymizedAt` (different operations)
- [ ] Data export endpoint exists if the app collects personal data
- [ ] Consent stored with version and timestamp if required
- [ ] Retention cron configured for data past its retention period

---

### 10. Supply Chain

```bash
# Check for packages with install scripts (potential supply chain risk)
cat node_modules/.package-lock.json | jq '.packages | to_entries[] | select(.value.scripts.install or .value.scripts.postinstall) | .key'

# Verify lockfile is committed and up to date
git status package-lock.json
```

Verify `package-lock.json` is committed — never `.npmrc` with auth tokens.

---

## Report format

Create or update `docs/security-audit-full.md`:

```markdown
# Full Security Audit — YYYY-MM-DD

## Summary
| Check | Status | Findings |
|-------|--------|----------|
| Static analysis (Semgrep) | ✅ / ⚠️ | N issues |
| Dependency audit | ✅ / ⚠️ | N vulnerabilities |
| Secret scanning | ✅ / ⚠️ | N findings |
| Auth & authorization | ✅ / ⚠️ | N unprotected endpoints |
| Input validation | ✅ / ⚠️ | N missing Zod schemas |
| Rate limiting | ✅ / ⚠️ | N unprotected endpoints |
| Security headers | ✅ / ⚠️ | N missing headers |
| Logging & data exposure | ✅ / ⚠️ | N issues |
| GDPR / Privacy | ✅ / ⚠️ | N gaps |
| Supply chain | ✅ / ⚠️ | N risks |

## Findings detail
[For each ⚠️: description, severity, file/line, proposed fix, accepted risk justification if not fixing]

## Next audit scheduled
[Date — quarterly recommended]
```

## Gate
Present the full report to the human with a summary of all findings.

- **All green**: *"Security audit complete. All 10 checks passed. Report at `docs/security-audit-full.md`."*
- **Findings present**: *"Security audit found [N] issues. [Severity breakdown]. Recommended fixes: [list]. How should we prioritize?"*

Do not auto-fix findings without human approval — some may be accepted risks or false positives.
