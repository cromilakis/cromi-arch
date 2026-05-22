# kromi-arch

**Engineering Playbook** para equipos que usan Claude Code — incluye metodología SDD+BDD, 22 skills de agente y una knowledge base semántica con búsqueda vectorial sobre 83 documentos técnicos.

---

## ¿Qué incluye?

| Componente | Descripción |
|---|---|
| **22 skills de agente** | Comandos `/karch-*` que Claude usa directamente en Claude Code |
| **Metodología 11 fases** | Flujo SDD+BDD desde intake hasta producción |
| **Knowledge base semántica** | 653 chunks indexados con pgvector + búsqueda híbrida (vector + FTS) |
| **`kromi-search` CLI** | Claude busca en el playbook completo vía Bash sin MCP ni intermediarios |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code                        │
│                                                     │
│  /karch-phase-0  →  skill md en ~/.claude/commands/ │
│  /karch-bugfix   →  skill md en ~/.claude/commands/ │
│                                                     │
│  Bash("kromi-search 'query'")                       │
│         │                                           │
│         ▼                                           │
│  bin/kromi-search ──► OpenAI API (embedding query)  │
│         │                                           │
│         ▼                                           │
│  PostgreSQL + pgvector (localhost:5433)             │
│  ← Hybrid search: vector cosine + FTS (RRF) ─►     │
│  Resultados rankeados con score normalizado         │
└─────────────────────────────────────────────────────┘
```

**Flujo de búsqueda:**
1. Claude llama `kromi-search "<pregunta>"` vía Bash tool
2. El CLI embeds la query con `text-embedding-3-small` (OpenAI)
3. Busca en PostgreSQL + pgvector con Reciprocal Rank Fusion (vector + full-text)
4. Devuelve los chunks más relevantes del playbook con score y fuente

**La knowledge base viaja en el paquete** (`knowledge.json.gz`, 4 MB) — los usuarios no necesitan OpenAI key para instalar, solo para buscar.

---

## Instalación para usuarios

### Requisitos

- Node.js >= 18
- Docker Desktop (para la knowledge base)
- OpenAI API key (para búsqueda semántica)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (para instalar spec-kit automáticamente)

### 1. Instalar el paquete

```bash
npx kromi-arch install
```

Esto instala los 22 skills en `~/.claude/commands/` y actualiza tu `~/.claude/CLAUDE.md` con el contexto del playbook.

Para instalar solo en el proyecto actual (en vez de global):

```bash
npx kromi-arch install --local
```

### 2. Levantar la knowledge base

```bash
npx kromi-arch db:start
npx kromi-arch db:restore
```

`db:start` levanta PostgreSQL + pgvector con Docker. `db:restore` importa el índice pregenerado que viene en el paquete — **no requiere OpenAI key**.

### 3. Configurar la API key de OpenAI

La key se usa únicamente para embeds al momento de búsqueda (no para indexar, ya viene indexado).

```bash
npx kromi-arch config set openai-key sk-...
```

En macOS se guarda en el **Keychain del sistema** — nunca en disco ni en variables de entorno.

### 4. Verificar

```bash
npx kromi-arch status
```

```
✓ 22 skills instalados
✓ CLAUDE.md: bloque kromi-arch presente
✓ Knowledge DB: corriendo (PostgreSQL + pgvector en puerto 5433)
✓ OpenAI API key: configurada
```

---

## Uso en Claude Code

### Skills disponibles

Una vez instalado, abrí Claude Code y usá los skills directamente:

```
/karch-phase-0    Intake — leer issue, clarificar scope
/karch-phase-1    SDD Spec — especificación formal
/karch-phase-2    BDD Scenarios — casos de prueba en Gherkin
/karch-phase-3    DB Schema — diseño de base de datos
/karch-phase-4    API Design — contratos REST
/karch-phase-5    Implementation — codificación guiada
/karch-phase-6    Testing — unit + E2E
/karch-phase-7    Security Check — revisión OWASP
/karch-phase-8    Performance — métricas y budget
/karch-phase-9    Deploy — Vercel + CI/CD
/karch-phase-10   Review — retrospectiva y ADR

/karch-bugfix         Diagnóstico y fix de bugs
/karch-migration      Migraciones de base de datos
/karch-adr            Registro de decisiones arquitectónicas
/karch-build          Build y bundle analysis
/karch-security-check Auditoría de seguridad
/karch-ctx-data       Contexto: capa de datos
/karch-ctx-git        Contexto: flujo Git
/karch-ctx-ops        Contexto: operaciones y deploy
/karch-ctx-security   Contexto: seguridad
/karch-ctx-tools      Contexto: herramientas del stack
/karch-ctx-ux         Contexto: UX y componentes
```

### Búsqueda semántica

Claude busca en el playbook automáticamente cuando necesita referencia técnica:

```bash
kromi-search "cómo implementar webhooks con Stripe"
kromi-search "estrategia de caché para TanStack Query" --limit 3
kromi-search "configurar Sentry con Next.js App Router"
```

---

## Comandos de referencia

```bash
# Instalación y gestión
npx kromi-arch install              # Instala skills en ~/.claude/ (global)
npx kromi-arch install --local      # Instala en .claude/ del proyecto
npx kromi-arch uninstall            # Desinstala
npx kromi-arch status               # Estado completo

# Knowledge base
npx kromi-arch db:start             # Levanta PostgreSQL + pgvector
npx kromi-arch db:restore           # Restaura índice pregenerado (sin OpenAI key)
npx kromi-arch db:stop              # Detiene la DB

# Configuración
npx kromi-arch config set openai-key sk-...   # Guarda API key (macOS Keychain)
npx kromi-arch config get openai-key          # Verifica si está configurada
```

---

## Stack que cubre el playbook

| Componente | Elección |
|---|---|
| Framework | Next.js (App Router) + TypeScript strict |
| ORM | Prisma + Zod DTOs |
| Base de datos | PostgreSQL |
| Auth | Auth.js v5 |
| Testing unit | Vitest + MSW |
| Testing E2E | Playwright BDD (Gherkin) |
| UI | shadcn/ui + Tailwind v4 |
| Server state | TanStack Query |
| Client state | Zustand |
| Email | Resend + React Email |
| Storage | Supabase Storage |
| Pagos | Stripe |
| i18n | next-intl |
| Background jobs | Vercel Cron / Inngest |
| Observabilidad | Sentry + Pino + OpenTelemetry |
| Deploy | Vercel |
| CI/CD | GitHub Actions |

---

## Para el maintainer

Para actualizar el playbook y publicar una nueva versión:

```bash
npx kromi-arch release
```

Este comando ejecuta en secuencia:
1. Re-indexa todos los docs con `--force` (usa la key del Keychain)
2. Regenera `knowledge.json.gz`
3. Bumea la versión patch en `package.json`
4. Commitea y pushea los cambios
5. Publica en npm

Requiere tener configurada la OpenAI API key y estar autenticado en npm (`npm login`).

---

## Licencia

MIT — Isaias Peña Cromilakis
