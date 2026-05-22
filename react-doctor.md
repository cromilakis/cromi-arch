# 🩺 React Doctor: Salud del Código React

## ¿Qué es?

Escanea tu código React/Next.js y produce un **health score (0-100)** con diagnósticos accionables en 5 categorías: estado y efectos, rendimiento, arquitectura, seguridad y accesibilidad.

> Creado por el equipo de [Million.js](https://million.dev) — los mismos que optimizan React.

## Instalación

```bash
npx react-doctor@latest
```

Un solo comando. Detecta automáticamente el framework (Next.js, Vite, React Native) y la versión de React.

## Health Score

| Score | Significado |
|-------|-------------|
| **75+** | Bueno |
| **50-74** | Necesita trabajo |
| **<50** | Crítico |

## Integración en CI/CD

Agregar como GitHub Action en nuestro pipeline de PR:

```yaml
# .github/workflows/react-doctor.yml
name: React Doctor
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  react-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: millionco/react-doctor@main
        with:
          diff: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on: warning
```

Esto publica un **comentario sticky en el PR** con los hallazgos, actualizado en cada push.

## Instalación en el agente

Para que el agente aprenda las reglas y no escriba mal código desde el principio:

```bash
npx react-doctor@latest install
```

Esto configura las reglas en Claude Code, Cursor, Codex y otros agentes compatibles.

## Integración con pre-commit

```bash
npx react-doctor@latest --staged --fail-on error
```

Solo revisa archivos staged, ideal para pre-commit hooks con Husky.

## Categorías de reglas

| Categoría | Qué detecta |
|-----------|-------------|
| **State & Effects** | useEffect con deps incorrectas, estado fuera de lugar, patrones anti-Reyes |
| **Performance** | Re-renders innecesarios, falta de memo/useMemo, bundles grandes |
| **Arquitectura** | Componentes muy grandes, mezcla de responsabilidades, patrones incorrectos |
| **Seguridad** | dangerouslySetInnerHTML, inputs sin sanitizar, XSS potencial |
| **Accesibilidad** | ARIA faltante, roles incorrectos, elementos interactivos sin keyboard support |

## Dónde encaja en nuestro stack

| Herramienta | Cuándo se usa |
|-------------|---------------|
| **ESLint** | En cada commit (pre-commit hook) |
| **Semgrep** | En cada commit (pre-commit hook) — seguridad general |
| **React Doctor** | En CI (PR checks) + score de salud general |
| **Vitest** | En cada commit — cobertura de tests |
| **Lighthouse CI** | En CI — performance de usuario real |

React Doctor se enfoca específicamente en **salud de React**, algo que ESLint y Semgrep no cubren con la misma profundidad.

## Limitaciones

- v0.2.1 — proyecto joven, las reglas siguen evolucionando
- Requiere Node.js >= 22
- El score online requiere conexión a react.doctor (opcional, `--offline` funciona sin conexión)

## Referencias

- Repositorio: https://github.com/millionco/react-doctor
- npm: `react-doctor`
- Web: https://react.doctor
- [Performance Budget](/performance-budget.md) — React Doctor complementa las métricas de Core Web Vitals
- [Fase 9 — CI/CD](/fases/fase-9-cicd.md) — agregar el GitHub Action al pipeline de PR
