# 🧠 Memoria Persistente (pgvector)

Sistema de memoria persistente basado en **PostgreSQL + pgvector** para que el agente tenga memoria persistente, corregible y olvidable. Diseñada para búsqueda semántica (RAG), versionado de correcciones, y continuidad entre plataformas (CLI ↔ Telegram).

---

## Esquema de Base de Datos

```sql
CREATE TABLE memoria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente          VARCHAR(20) NOT NULL DEFAULT 'agente',
  -- 'agente' | 'usuario' | 'sistema'

  tipo            VARCHAR(30) NOT NULL,
  -- 'leccion' | 'decision' | 'preferencia' | 'patron'
  -- 'sesion' | 'perfil' | 'contexto_proyecto' | 'doc_aprendida' | 'tarea'

  titulo          VARCHAR(200) NOT NULL,
  resumen         TEXT NOT NULL,
  detalle         TEXT,
  embedding       VECTOR(384),            -- all-MiniLM-L6-v2
  metadatos       JSONB NOT NULL DEFAULT '{}',  -- según tipo
  tags            TEXT[] DEFAULT '{}',
  importancia     SMALLINT DEFAULT 1 CHECK (importancia BETWEEN 1 AND 5),

  -- Versionado de correcciones
  version         INT DEFAULT 1,
  superseded_by   UUID REFERENCES memoria(id),
  superseded_at   TIMESTAMPTZ,
  razon_correccion TEXT,

  -- Ciclo de vida
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  access_count    INT DEFAULT 0,
  last_accessed   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,

  proyecto        VARCHAR(100),
  session_id      VARCHAR(50)             -- para bridge cross-platform
);
```

---

## Tipos de Memoria

| Tipo | Cuándo se crea | Ejemplo de metadatos |
|------|----------------|----------------------|
| `leccion` | Error resuelto, workaround encontrado | `{problema, solucion, stack, severidad}` |
| `decision` | Elección técnica importante | `{opciones, elegido, razon_principal, tradeoffs}` |
| `preferencia` | Usuario expresó una preferencia | `{area, tema, valor, confianza: "confirmada"}` |
| `patron` | Código reutilizable descubierto | `{nombre, lenguaje, framework, cuando_usar}` |
| `sesion` | Estado de tarea entre canales | `{canal_origen, ultimo_canal, progreso, pendiente}` |
| `perfil` | Quién es el usuario | `{nombre, rol, idioma, preferencias_clave}` |
| `contexto_proyecto` | Stack y propósito de un proyecto | `{stack, dominio, repo, skills_usados}` |
| `doc_aprendida` | Documentación o concepto aprendido | `{fuente, tema, url}` |
| `tarea` | Estado de una feature en desarrollo | `{estado, prioridad, feature, canales}` |

---

## Ciclo de Vida del Recuerdo

```mermaid
flowchart LR
    CREATE["🆕 Crear"] --> CONFIRM["✅ Confirmar"]
    CONFIRM --> CORRECT["✏️ Corregir\n(versiona a v2,v3...)"]
    CONFIRM --> ADJUST["🔄 Ajustar\n(refinar metadatos)"]
    CORRECT --> FORGET["🗑️ Olvidar\n(importancia=0 + expires)"]
    ADJUST --> FORGET
    FORGET --> CLEAN["🧹 DELETE automático\n(7 días)"]

    style CREATE fill:#6C5CE7,color:#fff
    style CONFIRM fill:#00B894,color:#fff
    style CORRECT fill:#FDCB6E,color:#000
    style ADJUST fill:#0984E3,color:#fff
    style FORGET fill:#E17055,color:#fff
    style CLEAN fill:#D63031,color:#fff
```

- **Corregir**: no se sobrescribe — se crea v2 y v1 apunta a v2 via `superseded_by`. El historial de errores se conserva.
- **Ajustar**: UPDATE con changelog en `metadatos.ajustes[]`. Embedding se marca como desactualizado.
- **Olvidar**: `importancia=0` + `expires_at=NOW()+7d`. DELETE automático al expirar. No se pierde hasta la limpieza.

---

## Script CLI (memoria.py)

```bash
# Guardar un recuerdo
python3 scripts/memoria.py guardar \
  --tipo leccion \
  --titulo "Configurar Telegram" \
  --resumen "TELEGRAM_BOT_TOKEN en .env, TELEGRAM_ALLOWED_USERS para autorizar" \
  --tags "telegram,hermes,gateway" \
  --importancia 2 \
  --proyecto "hermes"

# Buscar recuerdos
python3 scripts/memoria.py buscar --texto "telegram auth"
python3 scripts/memoria.py buscar --tipo decision

# Corregir (versiona automáticamente)
python3 scripts/memoria.py corregir --id <uuid> --razon "Estaba incompleto, faltaba el fallback"

# Olvidar
python3 scripts/memoria.py olvidar --id <uuid>

# Estadísticas
python3 scripts/memoria.py stats
```

---

## Integración con el Agente

El agente utiliza la memoria de la siguiente forma:

1. **Al inicio de cada sesión**: cargar perfil + contexto del proyecto actual + últimas lecciones importantes
2. **Después de una decisión importante**: guardar como tipo `decision`
3. **Después de resolver un error**: guardar como tipo `leccion`
4. **Cuando el usuario expresa una preferencia**: guardar como tipo `preferencia`
5. **Cuando cambia de canal**: guardar checkpoint con `session_id`
6. **Antes de responder una pregunta técnica**: buscar recuerdos similares por similitud semántica
7. **Cuando el usuario corrige información previa**: versionar automáticamente con `corregir`

---

## Continuidad Cross-Platform

La memoria permite que el agente retome el hilo exacto al cambiar de canal. Por ejemplo:

- Inicias una sesión en **CLI** y el agente guarda el estado como `tipo: sesion`
- Luego preguntas desde **Telegram** y el agente busca la sesión activa por `session_id`
- El agente responde con el contexto completo de lo que se estaba haciendo

Esto se logra mediante el campo `session_id` en la tabla y las búsquedas por tipo `sesion`.

---

## Setup Local

```bash
# PostgreSQL 17 + pgvector
apt-get install postgresql postgresql-17-pgvector
pg_ctlcluster 17 main start
su - postgres -c "psql -c \"CREATE DATABASE memoria_db;\""
su - postgres -c "psql -d memoria_db -f scripts/memoria-setup.sql"

# Conexión
export MEMORIA_DB_URL="postgresql://user:***@localhost:5432/memoria_db"
```

Tablas, índices, vistas, triggers y recuerdos iniciales (perfil + stack) se crean automáticamente desde `scripts/memoria-setup.sql`.

## Costo

- **Local**: $0 (PostgreSQL en localhost o Docker)
- **Producción**: Supabase Pro ($25/mes) ya incluye pgvector activado

## Referencias

- [Database Patterns](/database-patterns.md) — índices y extensiones PostgreSQL (pgvector es una extensión)
- [Costos](/costos.md) — Supabase Pro ($25/mes) cubre almacenamiento de embeddings
- [Auditoria](/auditoria.md) — los recuerdos con PII deben seguir la misma política de retención
- [Estrategia .env](/decisiones/env-strategy.md) — `MEMORIA_DB_URL` como variable de entorno separada
