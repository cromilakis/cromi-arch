# ADRs (Architecture Decision Records)

Cada decisión técnica importante se documenta como un ADR para que quede registro del **por qué** de la elección, no solo del resultado. Un ADR escrito semanas después pierde el contexto — se escribe como borrador **en el momento de la decisión** y se completa en Fase 10.

---

## Ciclo de vida

```
Borrador       →     Aceptada      →     Deprecada
(en la fase        (publicada en       (reemplazada por
donde se tomó)      Fase 10)            otra decisión)
```

| Estado | Significado |
|---|---|
| `Borrador` | Decisión tomada, pendiente de completar consecuencias observadas |
| `Aceptada` | Publicada y vigente |
| `Deprecada` | Reemplazada por otra decisión — incluye referencia al ADR sucesor |

---

## Cuándo crear un ADR

Crear un borrador **inmediatamente** cuando se toma alguna de estas decisiones:

- Elección de stack o librería (Next.js, Prisma, Auth.js, shadcn/ui)
- Nueva integración externa (Stripe, Resend, Sentry, Supabase)
- Cambio de arquitectura (estructura de carpetas, patrón de datos, estrategia de auth)
- Estrategia de datos (migraciones, soft delete, paginación, caching)
- Decisiones de seguridad (rate limiting, RBAC, sesiones)
- Metodología de desarrollo (BDD, testing strategy, convenciones de commits)
- Cualquier decisión donde elegiste X sobre Y y el por qué no es obvio

**No crear un ADR para:**
- Decisiones reversibles sin consecuencias de largo plazo
- Convenciones ya documentadas en otro documento del playbook
- Preferencias de estilo (esas van en `estandares-diseno.md`)

---

## Template

```markdown
# ADR-NNN: [Título de la decisión en imperativo]

**Estado:** Borrador | Aceptada | Deprecada
**Fecha de decisión:** YYYY-MM-DD
**Fase donde se tomó:** Fase N
**Issue relacionado:** #NNN (si aplica)

## Contexto

¿Qué problema o pregunta forzó esta decisión?
¿Qué restricciones existían (tiempo, equipo, compatibilidad)?

## Opciones consideradas

### Opción A — [nombre]
- Pro: ...
- Pro: ...
- Contra: ...

### Opción B — [nombre]
- Pro: ...
- Contra: ...
- Contra: ...

## Decisión

Se eligió **[Opción X]** porque [razón principal].
[Razones secundarias si aplica.]

## Consecuencias esperadas

¿Qué trade-offs aceptamos? ¿Qué cambia en el proyecto?

## Consecuencias observadas ← completar en Fase 10

¿Fue la decisión correcta en la práctica?
¿Qué salió bien, qué salió mal, qué haríamos diferente?
```

---

## Reglas de escritura

- **Título en imperativo**: *"Usar Prisma como ORM"*, no *"Decisión sobre ORM"*
- **Contexto honesto**: incluir las restricciones reales, no solo las técnicas
- **Opciones reales**: solo listar opciones que se consideraron genuinamente
- **Consecuencias observadas**: se escriben en Fase 10 — son la parte más valiosa del ADR para el futuro
- **Si se depreca**: no borrar el ADR, actualizar estado a `Deprecada` y referenciar el sucesor

---

## ADRs iniciales del proyecto

Estos borradores se crean en las fases indicadas y se completan en Fase 10:

```
docs/adr/
├── adr-001-stack-tecnologico.md       ← Fase 1 — Next.js + TypeScript + Prisma + PostgreSQL
├── adr-002-arquitectura-api.md        ← Fase 3 — Route Handlers vs tRPC vs GraphQL
├── adr-003-bdd-playwright.md          ← Fase 3 — Playwright BDD vs Cucumber.js
├── adr-004-error-handling.md          ← Fase 3 — Error Boundaries + TanStack Query + Sentry
├── adr-005-testing-strategy.md        ← Fase 3 — Vitest + SQLite en memoria + MSW
└── adr-006-migration-strategy.md      ← Fase 9 — Expand-contract para zero-downtime
```

---

## Dónde viven los ADRs

```
docs/
└── adr/
    ├── adr-001-stack-tecnologico.md
    ├── adr-002-arquitectura-api.md
    └── ...
```

Los ADRs forman parte del repo — se versionan junto al código. Un ADR sin su código no tiene valor; un código sin su ADR pierde el contexto de por qué existe así.
