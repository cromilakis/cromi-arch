# karch-ctx-git — Git Workflow, GitHub, Feature Flags & CI/CD

Invoke this skill when setting up branches, writing commits, opening PRs, configuring branch protection, or implementing feature flags.

---

## Branch Naming

```
<type>/<issue-number>-<short-description>

Types:
  feat/       → new feature
  fix/        → bug fix
  chore/      → maintenance, deps, config
  docs/       → documentation only
  refactor/   → code restructure, no behavior change
  test/       → test additions or fixes
  hotfix/     → urgent production fix (branches from main)

Examples:
  feat/123-user-authentication
  fix/456-email-validation-error
  hotfix/789-payment-gateway-timeout
```

---

## Conventional Commits

```
<type>(<scope>): <concise description in imperative mood>

[optional body: what and why, not how]

[optional footer: Closes #NNN, BREAKING CHANGE: ...]
```

**Types:**
- `feat`: new feature (triggers minor version bump)
- `fix`: bug fix (triggers patch version bump)
- `docs`: documentation only
- `style`: formatting (no logic change)
- `refactor`: code change that neither fixes a bug nor adds a feature
- `test`: adding or correcting tests
- `chore`: build, deps, config, CI
- `perf`: performance improvement

**Rules:**
- Description: imperative mood ("add" not "adds", "fix" not "fixed")
- Max 72 characters on the subject line
- Reference the issue in the footer: `Closes #123`
- `BREAKING CHANGE:` in footer triggers major version bump
- One purpose per commit — never mix feature + refactor in the same commit

```bash
# Good examples
git commit -m "feat(auth): add Google OAuth provider

Closes #123"

git commit -m "fix(posts): prevent XSS in title field

Title was rendered as innerHTML. Now uses textContent.
Closes #456"

git commit -m "feat(billing)!: replace Stripe v2 with Stripe v3

BREAKING CHANGE: PaymentIntent shape changed. See migration guide in docs/billing-v3.md.
Closes #789"
```

---

## PR Workflow

### Creating a PR

```bash
# 1. Always branch from main
git checkout main && git pull
git checkout -b feat/123-user-auth

# 2. Make atomic commits (one logical change per commit)
git commit -m "feat(auth): add Auth.js v5 configuration"
git commit -m "feat(auth): add login page with email/password form"
git commit -m "test(auth): add Playwright BDD scenarios for login flow"

# 3. Open PR
gh pr create \
  --title "feat: add user authentication with Auth.js v5" \
  --body "$(cat <<'EOF'
## Summary
- Adds email/password and Google OAuth via Auth.js v5
- Protected routes via middleware
- RBAC: USER and ADMIN roles

## Testing
- [ ] Login with email/password
- [ ] Login with Google
- [ ] Protected route redirects unauthenticated users
- [ ] Admin-only routes block USER role

Closes #123

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

### PR Template

Create `.github/pull_request_template.md`:

```markdown
## Summary
<!-- 1-3 bullet points describing what this PR does -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
<!-- Bulleted checklist of what to test -->
- [ ] 

## Checklist
- [ ] Tests added / updated
- [ ] No console.log left in code
- [ ] i18n keys added for all new visible text
- [ ] Lighthouse score not degraded
- [ ] Closes #<issue-number>
```

---

## Squash Merge Strategy

All PRs are squash-merged into `main`. This keeps `git log` on main clean — one commit per PR.

```
main log:
  feat(auth): add user authentication (#125)
  fix(posts): prevent XSS in title (#124)
  feat(billing): add Stripe integration (#120)
```

Configure in GitHub: **Settings → General → Pull Requests → Allow squash merging only**.

The squash commit message should follow conventional commit format with the PR number.

---

## Branch Protection (main)

Configure in **Settings → Branches → Add rule for `main`**:

| Setting | Value |
|---------|-------|
| Require pull request before merging | ✅ |
| Required approving reviews | 1 minimum |
| Dismiss stale approvals on new commits | ✅ |
| Require status checks to pass | ✅ |
| Required status checks | `ci`, `semgrep`, `lighthouse` |
| Require branches to be up to date | ✅ |
| Do not allow bypassing above settings | ✅ |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

**Never force-push to main.** If the branch history needs correction, create a new commit that reverts or amends.

---

## CI/CD Pipeline (GitHub Actions)

Full pipeline that runs on every PR and push to main:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Type Check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Semgrep
        run: npx semgrep --config=auto --error
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

      - name: Tests + Coverage
        run: npx vitest run --coverage
        env:
          DATABASE_URL: file::memory:?cache=shared

      - name: Coverage Threshold
        run: |
          LINES=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          BRANCHES=$(cat coverage/coverage-summary.json | jq '.total.branches.pct')
          [ $(echo "$LINES >= 80" | bc) -eq 1 ] || (echo "Line coverage $LINES% < 80%" && exit 1)
          [ $(echo "$BRANCHES >= 70" | bc) -eq 1 ] || (echo "Branch coverage $BRANCHES% < 70%" && exit 1)

      - name: Build
        run: npm run build

      - name: Dependency Audit
        run: npm audit --audit-level=high

      - name: E2E Tests
        run: npx playwright test
        env:
          DATABASE_URL: file::memory:?cache=shared

      - name: Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## Feature Flags

### Environment-based (simplest — for dev/staging toggles)

```typescript
// src/lib/flags.ts
export const flags = {
  newDashboard: process.env.NEXT_PUBLIC_FF_NEW_DASHBOARD === 'true',
  betaSearch: process.env.NEXT_PUBLIC_FF_BETA_SEARCH === 'true',
  maintenanceMode: process.env.FF_MAINTENANCE_MODE === 'true',  // server-only flag
} as const

// Usage
import { flags } from '@/lib/flags'

if (flags.newDashboard) {
  return <NewDashboard />
}
return <Dashboard />
```

`.env.example`:
```bash
NEXT_PUBLIC_FF_NEW_DASHBOARD=false
NEXT_PUBLIC_FF_BETA_SEARCH=false
FF_MAINTENANCE_MODE=false
```

### User-based (gradual rollout / A/B testing)

```typescript
// src/lib/flags.ts — database-backed flags
import { prisma } from './db'

export async function isEnabled(flag: string, userId: string): Promise<boolean> {
  const featureFlag = await prisma.featureFlag.findUnique({
    where: { name: flag },
    select: { enabled: boolean, rolloutPercent: number, userIds: string[] },
  })

  if (!featureFlag || !featureFlag.enabled) return false

  // Explicit user list
  if (featureFlag.userIds.includes(userId)) return true

  // Percentage rollout — deterministic hash (same user always gets same result)
  if (featureFlag.rolloutPercent > 0) {
    const hash = parseInt(userId.slice(-8), 16) % 100
    return hash < featureFlag.rolloutPercent
  }

  return false
}
```

Prisma schema:
```prisma
model FeatureFlag {
  id             String   @id @default(cuid())
  name           String   @unique
  enabled        Boolean  @default(false)
  rolloutPercent Int      @default(0)    // 0-100
  userIds        String[]                // explicit whitelist
  updatedAt      DateTime @updatedAt
}
```

### A/B Testing pattern

```typescript
// Assign variant deterministically by userId
export function getVariant(flag: string, userId: string, variants: string[]): string {
  const hash = parseInt(userId.slice(-8), 16)
  return variants[hash % variants.length]
}

// Usage
const variant = getVariant('checkout-cta', session.user.id, ['control', 'treatment-a', 'treatment-b'])
```

---

## Commit Signing (optional but recommended)

```bash
# Generate GPG key
gpg --gen-key

# List keys
gpg --list-secret-keys --keyid-format=long

# Configure git to sign all commits
git config --global user.signingkey <KEY-ID>
git config --global commit.gpgsign true

# Export public key to add to GitHub
gpg --armor --export <KEY-ID>
```

---

## Husky + lint-staged (pre-commit hooks)

```bash
npm install -D husky lint-staged
npx husky init
```

```bash
# .husky/pre-commit
npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"],
    "*.tsx": ["react-doctor analyze --fail-on-error"]
  }
}
```

---

## Release Versioning

Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Commit type | Version bump |
|-------------|-------------|
| `fix:` | PATCH (1.0.0 → 1.0.1) |
| `feat:` | MINOR (1.0.0 → 1.1.0) |
| `BREAKING CHANGE:` | MAJOR (1.0.0 → 2.0.0) |

For automated releases use `semantic-release`:
```bash
npx semantic-release
```

Configured via `.releaserc.json` — reads conventional commits, creates GitHub release, updates CHANGELOG.md, publishes to npm if configured.
