# Fase 9: CI/CD (Endurecimiento del Pipeline)

**Propósito:** Endurecer el pipeline que fue scaffoldeado en Fase 5. El scaffold básico (lint + build + tests) ya estaba corriendo durante la implementación. Aquí se agregan los gates de seguridad, coverage, audit y se define la estrategia de deploy y migraciones.

## Pipeline completo

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx semgrep --config=auto --error   # Seguridad (añadido en Fase 9)
      - run: npm run lint                         # ESLint
      - run: npx vitest run --coverage            # Tests + coverage (exigido aquí)
      - run: npm run build                        # Build check
      - run: npm audit --audit-level=high         # Dependencias (añadido en Fase 9)

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm start &
      - uses: treosh/lighthouse-ci-action@v11
        with:
          budgetPath: ./performance-budget.json
          uploadArtifacts: true
```

## Gates de CI

| Gate | Descripción |
|---|---|
| Semgrep pasa | 0 vulnerabilidades críticas/altas |
| Lint pasa | 0 errores ESLint |
| Tests pasan | 100% tests verdes |
| Coverage no baja | Mínimo 80% lines, 70% branches |
| Build pasa | `npm run build` sin errores |
| Audit pasa | Sin vulnerabilidades high/critical |
| Lighthouse pasa | Presupuesto de rendimiento respetado |

## Modelo de deploy — siempre vía PR

**Nunca se hace push directo a `main`.** Todo cambio llega a producción a través de un PR.

```
rama feature/fix
    ↓
PR abierto → CI corre automáticamente → Vercel genera Preview
    ↓
Humano revisa el Preview (gate ✋)
    ↓
Merge a main (el humano lo hace en GitHub o le dice al agente que lo haga)
    ↓
Vercel detecta el merge → deploy a producción automático
```

El agente abre el PR y entrega las URLs. El merge lo ejecuta el humano — en GitHub directamente o indicándoselo al agente en el chat.

```bash
# El agente abre el PR así:
gh pr create --title "feat: [descripción]" --body "Closes #NNN" --base main

# Si el humano le pide hacer el merge:
gh pr merge <número> --squash --delete-branch
```

- **Background jobs**: Vercel Cron

## Estrategia de Migraciones (zero-downtime)

Las migraciones **no se ejecutan automáticamente en producción sin revisión**. Se sigue el patrón **expand-contract** para evitar downtime:

```
Paso 1 — EXPAND: Agregar la nueva columna/tabla como nullable o con default.
          Deploy. La app funciona con el schema viejo y el nuevo.

Paso 2 — MIGRATE: Backfill de datos existentes (script separado, no en la migration).
          La app sigue funcionando.

Paso 3 — CONTRACT: Hacer NOT NULL / eliminar columna vieja.
          Deploy final.
```

```yaml
# Migrations en CI (solo en entorno de preview/staging)
- name: Run migrations (preview only)
  if: github.ref != 'refs/heads/main'
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_PREVIEW }}

# En producción: migration manual aprobada
# npx prisma migrate deploy --preview-feature
```

**Regla:** Nunca ejecutar `prisma migrate deploy` en producción desde CI sin revisión humana explícita. Las migrations destructivas (DROP COLUMN, NOT NULL sin default) siempre requieren un gate adicional.

## Rollback

- **Código**: revert del commit en `main` → Vercel redeploy automático (< 2 min)
- **Migrations**: no se revierten automáticamente. Seguir el procedimiento del runbook (`docs/runbook.md`)
- **Feature flags**: desactivar la feature flag del módulo afectado como primera línea de defensa

## Artefactos

| Archivo | Descripción |
|---|---|
| `.github/workflows/ci.yml` | Pipeline de CI/CD completo |

## Gate Humano — Siempre-stop

El agente abre el PR, CI corre, Vercel genera el Preview. Luego reporta:

> "PR #NNN abierto. CI: ✅. Preview: [URL Vercel]. Revisa el preview y dime si integro a main o lo haces tú en GitHub."

El humano tiene dos opciones:
- **Merge manual**: lo hace directamente en GitHub
- **Merge vía agente**: le dice *"integra el PR"* y el agente corre `gh pr merge`

En ambos casos el merge a `main` dispara el deploy a producción automáticamente en Vercel.

✅ Gate aprobado → Fase 10.
