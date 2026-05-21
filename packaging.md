# Packaging de kromi-arch

Cómo funciona el sistema de distribución del playbook: por qué se eligió npm, cómo se instala, actualiza y desinstala, y cómo se mantiene sincronizado con la documentación.

---

## Por qué npm / npx

Se evaluaron varias alternativas:

| Mecanismo | Pros | Contras | Veredicto |
|-----------|------|---------|-----------|
| **npm / npx** | Universal en proyectos JS/TS, versionado semver nativo, sin instalación global requerida, funciona en CI | Solo ecosistema Node.js | ✅ Elegido |
| Shell script (curl pipe bash) | Simple | Sin versiones, sin integridad verificable, antipatrón de seguridad | ❌ |
| Git submodule | Siempre en sync con el repo | UX compleja, no es zero-install, bloquea en equipos sin acceso al repo | ❌ |
| Homebrew tap | Nativo en macOS | Solo macOS, requiere mantener una tap separada, lento de actualizar | ❌ |
| npm global install | Funciona | Polluciona el PATH global, versión fija hasta `npm update -g` | ❌ |
| Copiar archivos manualmente | Sin dependencias | No tiene actualización, se desincroniza | ❌ |

**La razón concreta:** cualquier proyecto que use este playbook ya tiene Node.js instalado. `npx kromi-arch install` funciona sin instalar nada permanentemente — npx descarga el paquete, lo ejecuta, y lo descarta. Para la siguiente ejecución, si el paquete cambió, descarga la nueva versión automáticamente.

---

## Estructura del paquete

Solo los directorios en `files` de `package.json` se publican en npm — el resto (docs, fases/, decisiones/, etc.) son solo el repo de desarrollo:

```
kromi-arch/                         ← repo completo (GitHub)
│
├── *.md  fases/  decisiones/  ...  ← documentación (no se publica en npm)
│
├── commands/                        ← se publica ✅
│   ├── karch-fase-0.md
│   ├── karch-fase-1.md
│   └── ...
│
├── templates/                       ← se publica ✅
│   └── CLAUDE.md
│
├── bin/                             ← se publica ✅
│   └── cli.js
│
└── package.json                     ← se publica ✅
```

Los archivos de `commands/` tienen el prefijo `karch-` para:
1. Identificarlos fácilmente en `~/.claude/commands/` entre otros comandos del usuario
2. Desinstalarlos con un solo glob: `rm ~/.claude/commands/karch-*`
3. Evitar colisiones con comandos propios del usuario o de otras herramientas

---

## Cómo funciona `install`

```bash
npx kromi-arch install          # global → ~/.claude/
npx kromi-arch install --local  # local  → ./.claude/
```

Pasos que ejecuta el CLI:

```
1. Determina el directorio destino:
   - global:  ~/.claude/
   - local:   <cwd>/.claude/

2. Crea ~/.claude/commands/ si no existe

3. Copia commands/karch-*.md → <destino>/commands/
   (sobreescribe si ya existen — install es idempotente)

4. Gestiona CLAUDE.md:
   - Si no existe: crea <destino>/CLAUDE.md con el contenido del template
   - Si existe sin markers: append del bloque kromi-arch al final
   - Si existe con markers: reemplaza solo el bloque entre markers

5. Imprime resumen: versión instalada, skills copiados, ruta
```

### Markers en CLAUDE.md

El CLI usa markers HTML para identificar y actualizar solo su sección — nunca toca el contenido propio del usuario:

```markdown
Tu contenido personal en CLAUDE.md...

<!-- kromi-arch:start -->
[contenido gestionado por kromi-arch — no editar manualmente]
<!-- kromi-arch:end -->
```

Al actualizar, solo el bloque entre markers se reemplaza. El contenido exterior no se toca.

---

## Cómo funciona `uninstall`

```bash
npx kromi-arch uninstall          # elimina de ~/.claude/
npx kromi-arch uninstall --local  # elimina de ./.claude/
```

Pasos:

```
1. Elimina todos los archivos karch-* de <destino>/commands/
2. Elimina el bloque <!-- kromi-arch:start/end --> de CLAUDE.md
3. Si CLAUDE.md queda vacío, lo elimina
4. No toca ningún otro archivo del usuario
```

La desinstalación es limpia y reversible: no deja archivos huérfanos.

---

## Cómo funciona `update`

```bash
npx kromi-arch@latest update          # actualiza a la última versión
npx kromi-arch@1.2.0 update           # actualiza a una versión específica
```

`update` es idéntico a `install` — sobreescribe los archivos existentes con la versión del paquete descargado. Como `npx` siempre descarga la versión especificada (o `latest`), basta con especificar la versión en el comando.

Para saber qué versión está instalada vs la disponible:

```bash
npx kromi-arch status
```

Salida:
```
kromi-arch v1.2.0 instalado en ~/.claude/
Última versión disponible: v1.3.0

Skills instalados (14):
  /karch-fase-0   /karch-fase-1   /karch-fase-2
  /karch-fase-3   /karch-fase-4   /karch-fase-5
  ...

Para actualizar: npx kromi-arch@latest update
```

---

## Versionado del paquete

Sigue semver estricto. La regla es qué impacto tiene el cambio en los proyectos que ya lo tienen instalado:

| Tipo | Cuándo | Ejemplo |
|------|--------|---------|
| `patch` | Corrección en doc o skill sin cambiar comportamiento | Typo en fase-6, ejemplo de código incorrecto |
| `minor` | Skill nuevo, sección nueva en CLAUDE.md, doc nuevo | Agregar `/karch-privacy-check`, nuevo skill transversal |
| `major` | Cambio en el flujo de fases, renombrado de skills, cambio en CLAUDE.md que rompe overrides existentes | Reestructura de la metodología |

```bash
# Flujo de publicación
npm version patch   # o minor o major — actualiza package.json y crea tag git
npm publish         # publica en npm registry
git push --tags     # sube el tag al repo
```

---

## Idioma de los artefactos

El repo maneja dos idiomas con propósitos distintos:

| Artefacto | Idioma | Razón |
|-----------|--------|-------|
| `*.md` documentación del playbook | Español | Escrita para el desarrollador humano |
| `commands/karch-*.md` skills | **Inglés** | Instrucciones para Claude — mayor precisión técnica y alineación con cómo el modelo procesa instrucciones |
| `templates/CLAUDE.md` | **Inglés** | Contexto permanente para Claude |
| `packaging.md`, `bin/` outputs | Español | UX e información para el desarrollador |

**Regla:** todo artefacto que Claude lee y ejecuta se escribe en inglés. Todo artefacto que el desarrollador humano lee se escribe en español. La línea divisoria es el consumidor del artefacto.

---

## Relación entre docs y skills

Los skills en `commands/` son **autocontenidos** — no dependen de que el usuario tenga acceso al repo de kromi-arch en runtime. El flujo de mantenimiento es:

```
1. Se actualiza un doc (ej: owasp-api.md)
2. Se actualiza el skill correspondiente (karch-fase-6.md) para reflejar el cambio
3. npm version patch && npm publish
4. Los usuarios ejecutan: npx kromi-arch@latest update
```

La sincronización entre docs y skills es manual y deliberada — los skills son una destilación de los docs, no una copia. Cuando un doc cambia en detalle menor (ejemplos, referencias) no siempre requiere actualizar el skill. Cuando cambia la metodología o una decisión técnica clave, sí.

**Regla:** si el cambio afecta a cómo Claude debe actuar en una fase, actualizar el skill. Si solo afecta a la explicación para el desarrollador humano, solo actualizar el doc.

---

## Estructura de un skill (`karch-fase-N.md`)

Cada skill sigue esta estructura para ser autocontenido y ejecutable:

```markdown
# karch-fase-N — [Nombre de la Fase]

## Propósito
[Qué hace esta fase y por qué existe]

## Contexto previo requerido
[Qué debe existir antes de ejecutar esta fase]

## Pasos
[Lista numerada y concreta de lo que hace Claude]

## Stack y decisiones aplicables
[Las decisiones técnicas relevantes para esta fase]

## Artefactos que produce
[Lista de archivos/documentos que genera esta fase]

## Gate
[Condición exacta para pasar a la siguiente fase]

## Señales de error
[Qué hacer si algo sale mal en esta fase]
```

---

## Setup de desarrollo del paquete

Para contribuir al paquete (no es necesario para usarlo):

```bash
git clone https://github.com/[org]/kromi-arch
cd kromi-arch
node bin/cli.js install    # probar en local sin publicar
node bin/cli.js status
node bin/cli.js uninstall
```

Para probar cambios antes de publicar:

```bash
npm pack                   # genera kromi-arch-X.Y.Z.tgz
npx ./kromi-arch-X.Y.Z.tgz install   # instala desde el .tgz local
```

---

## Referencias

- [Stack Tecnológico](/stack.md) — decisiones que se incluyen en el CLAUDE.md instalado
- [Fases del Ciclo de Vida](/fases/README.md) — el flujo que implementan los skills
- [Reglas del Agente](/reglas-agente.md) — las reglas de gobernanza que van en CLAUDE.md
- [Secret Rotation](/secret-rotation.md) — el paquete no gestiona secretos; los proyectos los gestionan por separado
