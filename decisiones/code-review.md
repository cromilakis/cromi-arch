# Code Review Process

## Flujo de PR

```
1. Crear branch: feat/mi-feature
2. Codeo con TDD/BDD (RED → GREEN → REFACTOR)
3. Push → GitHub Actions corre PR Checks
4. Humano revisa diff (opcional, equipo de 1)
5. Squash merge a main → Vercel deploy
```

## PR Checks Automáticos (CI)

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on: pull_request
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx semgrep --config=auto --error  # Seguridad
      - run: npm run lint                         # ESLint
      - run: npx vitest run --coverage            # Tests + coverage
      - run: npm run build                        # Build check
      - run: npm audit --audit-level=high         # Dependencias
```

## Gates Obligatorios para Merge

| Gate | Descripción |
|---|---|
| Semgrep pasa | 0 vulnerabilidades críticas/altas |
| Lint pasa | 0 errores ESLint |
| Tests pasan | 100% tests verdes |
| Coverage no baja | Mínimo 80% lines, 70% branches |
| Build pasa | `npm run build` sin errores |
| Audit pasa | Sin vulnerabilidades high/critical |
| Commits convencionales | `feat:`, `fix:`, `refactor:`, etc. |

## Pre-commit (Husky + lint-staged + Semgrep)

```bash
# .husky/pre-commit
npx lint-staged
semgrep --config=auto --error
```

Esto corre ESLint + Prettier + Semgrep antes de cada commit, bloqueando si hay errores de seguridad o linting.
