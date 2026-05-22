# karch-phase-9 — CI/CD (Pipeline Hardening)

## Purpose
Harden the CI pipeline scaffolded in Phase 5 by adding security gates, coverage enforcement, dependency audit and the production deploy strategy. Then open the PR and hand control to the human.

## Prior context required
- Phase 8 monitoring complete
- All tests green, security audit clean
- Feature branch with all commits from Phases 5-8

## Steps

### 1. Harden `.github/workflows/ci.yml`
```yaml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx semgrep --config=auto --error        # security static analysis
      - run: npm run lint                              # ESLint
      - run: npx vitest run --coverage                # tests + coverage enforced
      - run: npm run build                             # build check
      - run: npm audit --audit-level=high             # dependency audit

  lighthouse:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm start &
      - uses: treosh/lighthouse-ci-action@v11
        with:
          budgetPath: ./performance-budget.json
          uploadArtifacts: true
```

### 2. Verify all CI gates pass locally before opening PR
| Gate | Command | Requirement |
|------|---------|-------------|
| Semgrep | `npx semgrep --config=auto` | 0 critical/high issues |
| Lint | `npm run lint` | 0 errors |
| Tests | `npx vitest run --coverage` | 100% green, coverage ≥ thresholds |
| Build | `npm run build` | No errors |
| Audit | `npm audit --audit-level=high` | 0 high/critical vulnerabilities |

### 3. Migration strategy for production
```
EXPAND  → Add new column/table as nullable or with a default.
          Deploy. App works with both old and new schema.

MIGRATE → Backfill existing data (separate script, not in the migration file).
          App keeps running.

CONTRACT → Make NOT NULL / drop old column.
           Final deploy.
```

```yaml
# Migrations in CI (preview/staging only — NEVER auto-run on production)
- name: Run migrations (preview only)
  if: github.ref != 'refs/heads/main'
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_PREVIEW }}
```

**Production migrations**: always manual, always with human review. Never run `prisma migrate deploy` on production from CI without explicit approval.

### 4. Verificación visual obligatoria antes de crear el PR

**Todo item del test plan debe ser verificado por el agente antes de crear el PR. Los checkboxes los marca el agente, no el humano.**

```bash
# Levantar servidor local
npm run dev &
sleep 5

# Para cada ruta afectada por el feature: navegar y verificar
npx playwright screenshot --full-page http://localhost:3000/<ruta> /tmp/preview-<ruta>.png
```

Verificar activamente en el browser o con Playwright:
- [ ] Todas las imágenes cargan (sin `alt` roto, sin ícono de imagen quebrada)
- [ ] Todos los íconos renderizan correctamente
- [ ] Todos los textos visibles en el idioma correcto (sin claves i18n sin resolver tipo `home.hero.title`)
- [ ] Todos los botones e interacciones funcionan
- [ ] La página no tiene errores en la consola del browser (`console.error`)
- [ ] Responsive: verificar al menos mobile (375px) y desktop (1280px)
- [ ] Los CTAs críticos del issue funcionan (links, formularios, llamadas a acción)

Si algún item falla → corregir antes de crear el PR. **Nunca crear un PR con items de verificación sin chequear o con elementos visualmente rotos.**

### 5. Open the PR
```bash
gh pr create \
  --title "feat: <description>" \
  --body "Closes #NNN

## Changes
- <summary of what was built>

## Testing
- X Gherkin scenarios green
- Coverage: X% lines, X% branches
- Lighthouse: Performance X / a11y X
- Security: Semgrep clean, npm audit clean

## Visual verification (verified by agent before PR)
- [x] Imágenes cargan sin errores
- [x] Íconos renderizan correctamente
- [x] Textos en idioma correcto, sin claves sin resolver
- [x] CTAs funcionan
- [x] Sin errores en consola
- [x] Responsive OK (mobile + desktop)
- [x] CI: lint + typecheck + tests + build pasan

## Preview
Vercel preview URL will appear below once CI passes." \
  --base main
```

### 6. Report to human
```
PR #NNN opened. CI: ✅. Preview: [Vercel URL].

Review the preview and let me know:
- "Merge it" → I'll run: gh pr merge <NNN> --squash --delete-branch
- Or merge directly in GitHub — both trigger the production deploy automatically.
```

### 7. Rollback plan
- **Code**: revert commit on `main` → Vercel redeploy automatic (< 2 min)
- **Migrations**: follow `docs/runbook.md` — never auto-revert
- **Feature flags**: disable the feature flag as first line of defense

## Artifacts produced
| File | Description |
|------|-------------|
| `.github/workflows/ci.yml` | Complete hardened CI/CD pipeline |

## Gate

> Antes de evaluar el gate: ejecutar `/karch-checklist phase=9 issue="<título>"` y resolver todos los items fallidos.

**ALWAYS-STOP gate.**

> "PR #NNN opened. CI: ✅. Preview: [Vercel URL]. Review the preview and tell me if I should merge or you'll do it in GitHub."

The agent opens the PR and delivers the URLs. The merge is executed by the human (in GitHub) or on explicit instruction to the agent (`gh pr merge`). Either way, merge to `main` triggers the production deploy automatically in Vercel.

✅ Gate approved → Phase 10.

## Error signals
- CI fails on PR: fix the failing gate, do not force-push or skip checks
- Production migration runs automatically in CI: remove it immediately — production migrations are always manual
- PR opened against wrong base branch: close and reopen against `main`
- PR creado con checkboxes del test plan sin marcar: el agente no verificó — cerrar el PR, verificar cada item, reabrirlo con todo marcado
- Imagen rota, ícono faltante o texto hardcodeado visible en el preview: el PR no debe existir — estos son bugs de implementación, no tareas del reviewer
