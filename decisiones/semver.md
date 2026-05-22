# Semantic Versioning

## Esquema

```
v1.0.0 → v1.1.0 → v2.0.0
  ^        ^        ^
  patch    minor    major
```

| Versión | Cuándo | Lo dispara |
|---|---|---|
| **PATCH** | Bugfix backward compatible | commit `fix:` |
| **MINOR** | Feature nueva backward compatible | commit `feat:` |
| **MAJOR** | Breaking change | commit con `!` o footer `BREAKING CHANGE:` |

Las versiones se incrementan automáticamente desde los [Conventional Commits](/github.md) — no hay que decidir manualmente.

## Automatización con release-please

`release-please` (Google) detecta los commits desde el último tag, calcula la próxima versión, genera el `CHANGELOG.md`, y **abre un PR** ("Release PR"). Al mergear ese PR, se crea el tag y el GitHub Release. Nunca hace push directo a `main`.

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
```

Con esta configuración:
1. Cada merge a `main` actualiza el Release PR automáticamente
2. Cuando el equipo decide publicar una release, mergea el Release PR
3. `release-please` crea el tag `vX.Y.Z` y el GitHub Release con notas generadas

## Cuándo usar semver

Para una **aplicación web SaaS en Vercel**, semver es útil como señal de comunicación, no como contrato técnico estricto:

- API pública con consumidores externos → **obligatorio**
- Comunicar breaking changes a integraciones → **obligatorio**
- Tracking interno de qué hay en producción → **recomendado**
- UI que solo usan usuarios finales → **opcional** (las versiones se pueden omitir)

Si la app no expone una API pública, los tags de git y el `CHANGELOG.md` son más valiosos que el número de versión en sí.

## Versión inicial

```
v0.x.y  → proyecto en desarrollo activo, puede haber breaking changes en minor
v1.0.0  → API estable y lista para consumidores externos
```

Partir desde `v0.1.0` y escalar a `v1.0.0` cuando la API sea estable.

## CHANGELOG.md

El archivo se genera y mantiene automáticamente desde Conventional Commits. No se edita a mano. Estructura por versión:

```markdown
## [1.2.0] - 2026-05-21

### Features
- feat(auth): agregar login con Google OAuth

### Bug Fixes
- fix(dashboard): corregir cálculo de métricas en rango de fechas

### ⚠ BREAKING CHANGES
- feat(api)!: cambiar formato de respuesta de paginación
```

## Referencias

- [GitHub](/github.md) — Conventional Commits, tipos de commit y breaking changes
- [Fase 9 — CI/CD](/fases/fase-9-cicd.md) — pipeline completo donde corre el workflow de release
