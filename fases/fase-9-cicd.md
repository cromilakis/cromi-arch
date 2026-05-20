# Fase 9: CI/CD

**Propósito:** Configurar el pipeline de integración continua y despliegue continuo.

## Pipeline

GitHub Actions ejecuta en cada PR:

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
      - run: npx semgrep --config=auto --error   # Seguridad
      - run: npm run lint                         # ESLint
      - run: npx vitest run --coverage            # Tests + coverage
      - run: npm run build                        # Build check
      - run: npm audit --audit-level=high         # Dependencias
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

## Deploy

- **Preview deploys**: automáticos por cada PR (Vercel)
- **Producción**: squash merge a `main` → deploy automático
- **DB migrations**: automáticas en CI
- **Background jobs**: Vercel Cron

## Artefactos

| Archivo | Descripción |
|---|---|
| `.github/workflows/ci.yml` | Pipeline de CI/CD |

## Gate Humano

> "Pipeline configurado. ¿Procedemos a merge a main?"

✅ Pipeline operativo y aprobado antes de pasar a Fase 10.
