# Code Review

Define los criterios de calidad que debe cumplir todo PR antes del merge. El pipeline que los ejecuta está en [Fase 9 — CI/CD](/fases/fase-9-cicd.md).

## Flujo de un PR

```
feat/mi-feature  →  push  →  CI verde  →  Vercel Preview  →  ✋ Humano aprueba  →  squash merge a main
```

1. El agente crea la branch y abre el PR (`gh pr create`)
2. GitHub Actions corre los checks automáticos (ver abajo)
3. Vercel genera un Preview automático por PR
4. El humano revisa el Preview — no el diff, la feature en el browser
5. Si aprueba: merge manual en GitHub, o le dice al agente que lo haga
6. Squash merge → deploy a producción automático

Ver convenciones de PR (título, cuerpo, labels) en [GitHub](/github.md).

## Gates obligatorios para merge

| Gate | Requisito |
|---|---|
| Semgrep | 0 vulnerabilidades críticas o altas |
| ESLint | 0 errores |
| Tests | 100% verde |
| Coverage | ≥ 80% lines, ≥ 70% branches |
| Build | `npm run build` sin errores |
| Audit | Sin dependencias con CVE high/critical |
| Commits | Formato convencional (`feat:`, `fix:`, etc.) |

Todos los gates corren en CI antes de que el PR pueda mergearse. La rama `main` está protegida: sin CI verde no hay merge.

## Pre-commit local (Husky + lint-staged)

Bloquea errores antes del push para no desperdiciar tiempo de CI:

```bash
# .husky/pre-commit
npx lint-staged
```

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

Semgrep corre en CI (no en pre-commit) para no ralentizar el flujo local en cada commit.

## Qué revisa el humano

El humano no revisa el diff línea a línea en PRs de un agente — el CI cubre eso. Lo que sí revisa:

- **La feature en el browser** (Vercel Preview): ¿hace lo que el issue pedía?
- **Casos borde**: ¿funciona en mobile, con datos vacíos, con errores?
- **UX**: ¿se siente correcto, messages de error claros, loading states?

Si hay algo que no cierra, el humano deja un comentario en el PR y el agente retoma.

## Configuración de rama protegida en GitHub

Settings → Branches → `main`:

```
✅ Require a pull request before merging
✅ Require status checks to pass before merging
   → quality (el job del workflow)
✅ Require branches to be up to date before merging
✅ Do not allow bypassing the above settings
```

## Referencias

- [GitHub](/github.md) — convenciones de branch, commits y PRs
- [Fase 9 — CI/CD](/fases/fase-9-cicd.md) — pipeline completo (YAML, Semgrep, audit)
- [Testing](/testing.md) — umbrales de coverage y herramientas
