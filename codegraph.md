# 🔬 CodeGraph: Grafo Semántico de Código

## ¿Qué es?

CodeGraph pre-indexa tu código en un **grafo de conocimiento** local (SQLite) con símbolos, relaciones, call graphs y rutas de framework. Permite explorar el código con **94% menos tool calls** que grep/ls/read.

## Instalación

```bash
# Global (recomendado)
npm install -g @colbymchenry/codegraph

# O vía npx
npx @colbymchenry/codegraph init
```

## Uso en un proyecto

```bash
cd mi-proyecto

# Inicializar (crea .codegraph/)
codegraph init

# Indexar todo el proyecto
codegraph index

# Después de cambios, sincronizar
codegraph sync

# Ver estado del índice
codegraph status
```

## Comandos clave para el desarrollo

| Comando | Propósito |
|---------|-----------|
| `codegraph status` | Ver cuántos símbolos y archivos están indexados |
| `codegraph query "UserService"` | Buscar símbolos por nombre |
| `codegraph context "implementar login"` | Construir contexto markdown con los archivos relevantes |
| `codegraph files` | Mostrar estructura de archivos del proyecto |
| `codegraph affected src/user.ts` | Encontrar tests afectados por cambios |
| `codegraph serve` | Servir como MCP server para asistentes AI |

## Integración con Hermes Agent

CodeGraph expone un **MCP server** que Hermes puede consumir:

```bash
# En una terminal, iniciar el servidor MCP
codegraph serve

# Luego en Hermes, configurar el MCP server
hermes mcp add codegraph --command "codegraph serve"
```

Esto expone herramientas como `codegraph_query`, `codegraph_context`, `codegraph_affected` directamente al agente.

## Workflow diario

```
1. git pull
2. codegraph sync          ← mantener índice actualizado
3. codegraph status        ← verificar que está fresco
4. codegraph context "feature X"  ← obtener contexto
5. Desarrollar...
6. codegraph affected src/mi-cambio.ts  ← qué tests correr
```

## Cuándo brilla

- **Proyectos existentes** con muchas carpetas: evita leer 20 archivos para entender relaciones
- **Refactors**: `codegraph context` + `codegraph affected` muestran el alcance completo
- **Code review**: entiende rápido qué impacto tiene un cambio
- **Onboarding**: nuevo dev (o agente) entiende la estructura en segundos

## Beneficios medidos

| Métrica | Sin CodeGraph | Con CodeGraph |
|---------|---------------|---------------|
| Tool calls para explorar | 40-50 | 1-6 |
| Tiempo de exploración | 1-2 min | 17-39s |
| Archivos leídos | 10-20 | 0 |
| Tokens gastados | 70k-100k | 40k-80k |

## Costo

100% gratis, 100% local. Sin APIs externas, sin límites.

## Referencias

- Repositorio: https://github.com/colbymchenry/codegraph
- npm: `@colbymchenry/codegraph`
- [AGENTS.md](/templates/AGENTS.md) — el harness usa CodeGraph para contextualizar código antes de cada fase
