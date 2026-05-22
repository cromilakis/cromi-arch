# Gestión de Dependencias

Proceso para mantener las dependencias actualizadas, seguras y auditadas.

## Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
      timezone: 'America/Mexico_City'
    versioning-strategy: increase
    open-pull-requests-limit: 10
    labels:
      - 'dependencies'
      - 'automerge'
    reviewers:
      - 'tech-leads'
    groups:
      # Agrupar updates de desarrollo para reducir PRs
      dev-dependencies:
        patterns:
          - 'eslint*'
          - 'prettier*'
          - '@types/*'
          - 'typescript'
        update-types:
          - 'minor'
          - 'patch'
    ignore:
      - dependency-name: 'react'
        versions: ['>=19.0.0']
      - dependency-name: 'next'
        versions: ['>=15.0.0']

  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'monthly'
```

Dependabot auto-merge para patches y minors:

```yaml
# .github/workflows/dependabot-auto-merge.yml
name: Dependabot auto-merge
on: pull_request_target

permissions:
  pull-requests: write
  contents: write

jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ahmadnassri/action-dependabot-auto-merge@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          command: squash and merge
          target: minor
```

## npm Audit en CI

Cada build en CI ejecuta auditoría de seguridad:

```yaml
# .github/workflows/ci.yml (fragmento)
jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
        continue-on-error: true   # No bloquea CI, pero notifica
```

Fallo solo si hay vulnerabilidades **critical**:

```bash
npm audit --audit-level=critical
```

## Socket.dev en CI

Además de npm audit, integrar [Socket.dev](https://socket.dev) para detectar **malware y comportamiento sospechoso**:

```yaml
# .github/workflows/socket.yml
name: Socket Security
on: [pull_request]

jobs:
  socket-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: socketdev/socket-action@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Socket.dev detecta:
- `postinstall` scripts peligrosos
- Paquetes que hacen llamadas a red inesperadas
- Acceso a sistema de archivos y variables de entorno
- Paquetes con pocos maintainers o recién publicados
- Typosquatting y dependency confusion

## Estrategia de Upgrades Mayores

Las actualizaciones de versiones mayores (major) siguen este proceso:

1. **Una por vez** — nunca mezclar varios majors en el mismo PR
2. **Revisar changelog** — leer breaking changes en orden
3. **PR dedicado** — branch `chore/upgrade-{package}-v{version}`
4. **Testing exhaustivo** — tests unitarios + e2e antes de merge
5. **Rollback plan** — si falla en staging, revertir commit

Flujo recomendado:

```bash
# 1. Ver changelog
npm view {package} versions --json | tail -5

# 2. Actualizar un solo paquete
npm install {package}@latest

# 3. Ejecutar tests
npm run test && npm run test:e2e

# 4. Verificar bundle size
npm run build && npm run analyze
```

## Proceso de Respuesta a Vulnerabilidades

| Severidad  | SLA       | Acción                                           |
|------------|-----------|--------------------------------------------------|
| Critical   | 24 horas  | Parche inmediato o mitigación temporal           |
| High       | 72 horas  | Actualizar dependencia o aplicar workaround      |
| Moderate   | 2 semanas | Programar en el próximo sprint                    |
| Low        | Próximo release | Incluir en el ciclo regular de updates     |

Comandos para investigar vulnerabilidades:

```bash
# Ver detalles de una vulnerabilidad
npm audit --json | jq '.vulnerabilities["{package}"]'

# Ver el árbol de dependencias que arrastra el paquete
npm ls {package}

# Forzar override de versión (solución temporal)
# En package.json:
# "overrides": { "transitive-dep": "2.0.0" }
```

## Auditoría Periódica de Dependencias

| Frecuencia | Actividad                              | Herramienta            |
|------------|----------------------------------------|------------------------|
| Semanal    | Dependabot PRs                         | GitHub Dependabot      |
| Quincenal  | Revisión manual de majors pendientes   | npm outdated           |
| Mensual    | Auditoría de seguridad completa        | npm audit + Snyk       |
| Trimestral | Revisión de dependencias no usadas     | depcheck               |
| Anual      | Evaluación de licencias                | license-checker        |

Comandos de auditoría:

```bash
# Paquetes desactualizados
npm outdated

# Dependencias no usadas
npx depcheck

# Licencias
npx license-checker --summary

# Tamaño de cada dependencia
npx cost-of-modules
```

## Lock File Management

Reglas para `package-lock.json`:

- **Siempre commitear** el lock file al repo
- **Nunca editarlo manualmente** — solo via `npm install`
- **Recrear si hay conflictos**:

```bash
# Resolver conflictos en lock file
git checkout --theirs package-lock.json
npm install           # regenera limpio
```

- Verificar integridad:

```bash
npm ci                # install desde lock (falla si no coincide)
npm ls --depth=0      # confirma que las versiones esperadas están instaladas
```
