# Estrategia de Actualización de Dependencias

Proceso para mantener el stack actualizado de forma sistemática sin romper producción. Complementa `dependencies.md` (que cubre Dependabot, auditorías y SLAs de vulnerabilidades) con la dimensión estratégica: cuándo y cómo actualizar versiones mayores del framework.

---

## Dos niveles de actualización

| Tipo | Qué incluye | Responsable | Frecuencia |
|------|-------------|-------------|-----------|
| **Parches y minors** | Bugfixes, features backward-compatible | Dependabot automático | Semanal |
| **Majors del stack** | Next.js, React, Prisma, Auth.js, TypeScript | Proceso manual planificado | Trimestral o por release |

Los parches y minors van por Dependabot (ver `dependencies.md`). Este documento cubre los **majors**.

---

## Cuándo actualizar a una versión mayor

No actualizar en cuanto sale — esperar a que el ecosistema se estabilice:

| Condición | Acción |
|-----------|--------|
| Release candidate (RC) | Solo en rama experimental, nunca en producción |
| Versión `.0` recién lanzada (< 2 semanas) | Esperar — bugs críticos suelen aparecer en las primeras semanas |
| Versión `.1` o posterior disponible | Candidata para evaluar |
| Adoptada por > 30% del ecosistema (npm stats) | Momento ideal para migrar |
| La versión actual entra en End of Life | Migración obligatoria en el siguiente sprint |

Fuentes para monitorear releases:
- Next.js: [github.com/vercel/next.js/releases](https://github.com/vercel/next.js/releases)
- React: [react.dev/blog](https://react.dev/blog)
- Prisma: [github.com/prisma/prisma/releases](https://github.com/prisma/prisma/releases)
- Node.js LTS: [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases)

---

## Proceso de upgrade mayor

### Paso 1 — Investigación (antes de tocar código)

```bash
# Ver qué versión tenemos vs la latest
npm outdated

# Leer el changelog oficial antes de cualquier cosa
# Buscar: "breaking changes", "migration guide", "deprecated"
```

Checklist de investigación:
- [ ] ¿Qué breaking changes tiene? ¿Alguno afecta nuestra app?
- [ ] ¿Hay guía de migración oficial?
- [ ] ¿Las dependencias que usamos son compatibles con la nueva versión?
- [ ] ¿Hay codemods disponibles para automatizar parte de la migración?

### Paso 2 — Branch dedicada

```bash
# Una branch por upgrade, nunca mezclar varios majors
git checkout -b chore/upgrade-nextjs-15

# Nunca mezclar un upgrade mayor con features o bugfixes
```

### Paso 3 — Actualizar y correr codemods

```bash
# Next.js — tiene codemod oficial
npx @next/codemod@latest upgrade latest

# React — cuando haya breaking changes
npx react-codemod@latest <transform>

# Prisma
npm install prisma@latest @prisma/client@latest
npx prisma generate   # regenerar el cliente

# TypeScript — normalmente no tiene codemod, revisar manualmente
npm install typescript@latest
npx tsc --noEmit     # ver qué rompe en tipado
```

### Paso 4 — Verificación en capas

```bash
# Capa 1: tipado (lo más rápido de detectar)
pnpm type-check

# Capa 2: tests unitarios e integración
pnpm test

# Capa 3: build completo
pnpm build

# Capa 4: tests E2E (la red de seguridad más amplia)
pnpm test:e2e

# Capa 5: revisión manual de flujos críticos en local
# → Login, registro, pago, dashboard principal
```

### Paso 5 — Deploy a preview

```bash
# Abrir PR con el upgrade — Vercel genera un preview URL automáticamente
gh pr create \
  --title "chore: upgrade Next.js 14 → 15" \
  --body "$(cat <<'EOF'
## Upgrade Next.js 14 → 15

**Cambios principales:**
- [listar los que aplican a nuestra app]

**Breaking changes manejados:**
- [qué se cambió y cómo]

**Testing:**
- [ ] type-check verde
- [ ] tests unitarios verdes
- [ ] E2E verdes
- [ ] Revisión manual de flujos críticos en preview

**Rollback:** revert de este PR, redeploy automático en < 2 min
EOF
)"
```

Revisar el preview con los flujos críticos antes de mergear.

### Paso 6 — Merge y monitoreo post-deploy

```bash
# Después del merge a main y deploy a producción:
# Monitorear Sentry durante 30 minutos para detectar regresiones
# Comparar error rate antes/después en Sentry → Stats → Trends
```

Si aparece un aumento de errores → rollback inmediato via Vercel.

---

## Pinning de versiones

### Qué pinear y qué no

```json
// package.json — criterios de pinning

{
  "dependencies": {
    // Framework principal: pinear major, dejar fluir minor/patch
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    // ORM: pinear major
    "prisma": "^6.0.0",
    "@prisma/client": "^6.0.0",

    // Dependencias de infraestructura crítica: pinear exacto si hubo incidente
    "@upstash/redis": "1.34.3",    // ← pinear exacto solo si un update causó un bug

    // UI components: pinear major, minor puede traer breaking changes en shadcn
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    // Dev tools: más permisivos, los errores no llegan a producción
    "typescript": "^5.0.0",
    "vitest": "^3.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

**Regla:** pinear exacto (`1.2.3` sin `^`) solo si un patch/minor anterior causó un incidente. Documentar el motivo en un comentario junto al pin.

### Overrides para dependencias transitivas

Cuando una dependencia transitiva tiene una vulnerabilidad y no puedes esperar a que la dependencia directa la actualice:

```json
// package.json
{
  "overrides": {
    "vulnerable-transitive-dep": ">=2.1.0"
  }
}
```

```bash
# Verificar que el override resolvió el problema
npm ls vulnerable-transitive-dep
npm audit
```

Documentar el override con un comentario y una fecha — revisarlo en el próximo sprint para ver si ya se puede eliminar.

---

## Calendario de upgrades

Revisar el estado del stack el **primer lunes de cada trimestre**:

```
Q1 (Enero)   — Revisar Node.js LTS + TypeScript + herramientas de testing
Q2 (Abril)   — Revisar Next.js + React + Tailwind
Q3 (Julio)   — Revisar Prisma + Auth.js + dependencias de seguridad
Q4 (Octubre) — Revisar integraciones externas (Stripe SDK, Sentry, etc.)
```

No es obligatorio actualizar cada trimestre — es obligatorio **evaluar** y decidir conscientemente si actualizar o diferir.

### Template de decisión trimestral

```markdown
## Revisión de stack — [Trimestre Año]

| Paquete | Versión actual | Última estable | Estado | Decisión |
|---------|---------------|----------------|--------|---------|
| next | 14.2.x | 15.1.x | Minor disponible | Actualizar este sprint |
| react | 18.3.x | 19.0.x | Major disponible | Diferir — evaluar Q2 |
| prisma | 5.x | 6.x | Major disponible | Actualizar — guía disponible |
| typescript | 5.3.x | 5.7.x | Minor disponible | Dependabot lo maneja |

**Riesgos identificados:**
- react@19: breaking changes en Server Components — revisar impacto en Q2

**Próxima revisión:** [fecha]
```

---

## Dependencias candidatas a eliminar

Revisar trimestralmente con `depcheck`:

```bash
# Detectar dependencias importadas pero no usadas
npx depcheck

# Detectar dependencias duplicadas (misma funcionalidad)
npx npm-check

# Ver el costo en bundle de cada dependencia
npx cost-of-modules --yarn
```

Criterios para eliminar una dependencia:

- No se usa en ningún archivo (`depcheck` la marca como unused)
- Tiene un equivalente nativo en Node.js o en el browser
- El paquete está abandonado (sin commits en > 2 años, sin respuesta a issues)
- Hay una dependencia más liviana que hace lo mismo

---

## Escenario: upgrade fallido después de merge

Si un upgrade llega a producción y causa errores:

```bash
# 1. Rollback inmediato via Vercel (< 60 segundos)
# Vercel Dashboard → Deployments → seleccionar el deploy anterior → Redeploy

# 2. Abrir issue urgente con:
#    - Versión que causó el problema
#    - Error exacto de Sentry (con link)
#    - Pasos para reproducir

# 3. Investigar en la rama del upgrade (no en main)
#    - ¿Qué breaking change no se detectó en testing?
#    - ¿Qué test habría detectado el problema?

# 4. Agregar el test faltante, luego reintentar el upgrade
```

---

## Referencias

- [Dependencies](/dependencies.md) — Dependabot, npm audit, Socket.dev, SLAs de vulnerabilidades (complementario a este doc)
- [Testing](/testing.md) — los tests E2E son la red de seguridad principal en upgrades mayores
- [Disaster Recovery](/disaster-recovery.md) — Escenario B (deploy roto) aplica también a upgrades fallidos
- [Supply Chain](/supply-chain.md) — verificar integridad de paquetes al actualizar
- [Secret Rotation](/secret-rotation.md) — un upgrade de Auth.js puede requerir ajustes en la gestión de sesiones
