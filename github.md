# GitHub

## Modelo de trabajo

**Nunca se hace push directo a `main`.** Todo cambio llega a producción a través de un PR. El merge a `main` dispara el deploy automático en Vercel.

```
main (protegida)
  └── feat/nombre-feature      ← el agente trabaja aquí
  └── fix/descripcion-bug
  └── refactor/area-afectada
  └── chore/tarea-tecnica
```

---

## Nomenclatura de branches

```
<tipo>/<descripcion-en-kebab-case>

feat/user-authentication
fix/login-redirect-mobile
refactor/payment-service
chore/update-dependencies
docs/api-endpoints
```

| Prefijo | Cuándo usarlo |
|---|---|
| `feat/` | Feature nueva o cambio de comportamiento |
| `fix/` | Corrección de bug |
| `refactor/` | Cambio interno sin impacto en comportamiento |
| `chore/` | Mantenimiento, dependencias, configuración |
| `docs/` | Solo documentación |

**Reglas:**
- Minúsculas y guiones, sin espacios ni caracteres especiales
- Descriptiva pero concisa — máximo 4-5 palabras
- El agente crea la branch antes del primer commit

---

## Commits convencionales (Conventional Commits)

### Formato

```
<tipo>(<scope opcional>): <descripción en imperativo>

<cuerpo opcional — el por qué, no el qué>

<footer opcional — referencias a issues>
```

### Tipos

| Tipo | Cuándo |
|---|---|
| `feat` | Funcionalidad nueva para el usuario |
| `fix` | Corrección de bug |
| `refactor` | Cambio de código sin cambio de comportamiento |
| `test` | Agrega o modifica tests |
| `docs` | Solo documentación |
| `chore` | Build, dependencias, configuración, CI |
| `perf` | Mejora de rendimiento |
| `style` | Formateo, punto y coma, sin cambio de lógica |

### Ejemplos correctos

```
feat(auth): agregar login con Google OAuth

fix(dashboard): corregir cálculo de métricas en rango de fechas

refactor(api): extraer validación de paginación a helper

test(payments): agregar escenario de pago rechazado

chore: actualizar dependencias de seguridad

docs(api): documentar endpoint de webhooks
```

### Ejemplos incorretos

```
fix: cosas                          ← demasiado vago
feat: Agregar Login Con Google      ← no en imperativo, mayúsculas
updated the dashboard               ← sin tipo, en pasado
WIP                                 ← nunca commitear WIP
```

### Scope

Opcional. Indica el módulo o área afectada. Usar el nombre del directorio de feature:

```
feat(auth): ...
fix(products): ...
refactor(billing): ...
```

### Breaking changes

```
feat(api)!: cambiar formato de respuesta de paginación

BREAKING CHANGE: el campo `data` ahora se llama `items`
```

El `!` y el footer `BREAKING CHANGE:` incrementan la versión mayor en semver automáticamente.

---

## Mensajes de PR

### Título

El título del PR sigue el mismo formato que el commit final (porque se hace squash merge):

```
feat(auth): agregar login con Google OAuth
fix(dashboard): corregir cálculo de métricas en rango de fechas
```

- Máximo 72 caracteres
- Mismo tipo que los commits del PR
- En imperativo, minúsculas

### Cuerpo — template

```markdown
## ¿Qué hace este PR?
Descripción concisa del cambio y su motivación.

## Cambios principales
- [ ] Cambio 1
- [ ] Cambio 2

## Cómo probar
1. Ir a [URL del preview de Vercel]
2. Hacer X
3. Verificar que Y

## Screenshots (si hay cambios visuales)
<!-- Adjuntar antes/después -->

## Checklist
- [ ] Tests pasan localmente
- [ ] Sin console.log de debug
- [ ] Variables de entorno documentadas en .env.example si aplica

Closes #NNN
```

---

## Labels en Issues y PRs

| Label | Uso |
|---|---|
| `bug` | Comportamiento incorrecto |
| `enhancement` | Feature nueva o mejora |
| `refactor` | Deuda técnica |
| `docs` | Solo documentación |
| `security` | Implicaciones de seguridad |
| `breaking-change` | Rompe compatibilidad |
| `needs-clarification` | Requiere más info del autor |
| `priority:high` | Bloquea otras cosas o afecta usuarios |
| `priority:low` | Nice-to-have, sin urgencia |

---

## Estrategia de merge

**Siempre squash merge.** Un PR = un commit limpio en `main`.

```
main: A -- B -- C -- D (squash del PR)
               ↑
feat/login: X -- Y -- Z -- fix typo -- fix lint
```

Razón: el historial de `main` queda limpio y legible. Cada commit en `main` corresponde a un PR completo y funcional.

**Nunca:**
- Merge commit (`--no-ff`) — ensucia el historial
- Rebase merge — reescribe SHAs, complica `git bisect`

---

## Protección de `main`

Configurar en GitHub → Settings → Branches:

- `Require a pull request before merging` ✅
- `Require status checks to pass` ✅ (CI debe estar verde)
- `Require branches to be up to date` ✅
- `Do not allow bypassing the above settings` ✅

---

## PR Draft

Usar Draft PR cuando el trabajo está en progreso pero se quiere feedback temprano o que CI corra:

```bash
gh pr create --draft --title "feat(auth): WIP Google OAuth"
```

Convertir a PR listo para merge:

```bash
gh pr ready <número>
```

---

## Linking Issues a PRs

Usar palabras clave en el cuerpo del PR para cerrar el issue automáticamente al hacer merge:

```
Closes #42          ← cierra el issue al mergear a main
Fixes #42           ← equivalente
Resolves #42        ← equivalente
```

El agente siempre incluye `Closes #NNN` en el cuerpo del PR referenciando el issue que lo originó.

---

## Flujo completo del agente

```bash
# 1. Crear branch desde main actualizado
git checkout main && git pull origin main
git checkout -b feat/nombre-feature

# 2. Commits durante el desarrollo
git add <archivos específicos>
git commit -m "feat(scope): descripción"

# 3. Abrir PR
gh pr create \
  --title "feat(scope): descripción" \
  --body "$(cat <<'EOF'
## ¿Qué hace este PR?
...

Closes #NNN
EOF
)" \
  --base main

# 4. Si el humano pide hacer el merge
gh pr merge <número> --squash --delete-branch
```
