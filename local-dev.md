# Entorno de Desarrollo Local

> INVESTIGADO: Node.js LTS schedule, Docker Compose v2 syntax, Prisma ORM docs.

Guía para levantar el proyecto en local.

## Prerrequisitos

| Herramienta  | Versión mínima | Cómo verificar    |
|-------------|----------------|-------------------|
| Node.js     | 22.x LTS       | `node --version`  |
| pnpm        | 10.x           | `pnpm --version`  |
| PostgreSQL  | 16             | `psql --version`  |
| Git         | 2.40+          | `git --version`   |
| Docker      | 27+            | `docker --version` |

## Docker Compose (PostgreSQL local)

Archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: myapp
      POSTGRES_DB: myapp_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Inicia la base de datos:

```bash
docker compose up -d
docker compose logs -f   # para ver logs
docker compose down      # para detener
```

## Setup inicial

```bash
# 1. Clonar el repositorio
git clone <repo-url> mi-app
cd mi-app

# 2. Instalar dependencias
pnpm install

# 3. Copiar variables de entorno
cp .env.example .env.local

# 4. Editar .env.local si es necesario
#    DATABASE_URL="postgresql://myapp:myapp@localhost:5432/myapp_dev"

# 5. Correr migraciones
pnpm db:migrate

# 6. Sembrar datos de prueba
pnpm db:seed

# 7. Iniciar servidor de desarrollo
pnpm dev
```

El servidor arranca en `http://localhost:3000`.

## Comandos útiles del día a día

| Comando                    | Descripción                              |
|----------------------------|------------------------------------------|
| `pnpm dev`                 | Inicia Next.js en modo desarrollo        |
| `pnpm build`               | Build de producción                      |
| `pnpm lint`                | ESLint + Prettier check                  |
| `pnpm test`                | Ejecuta tests (Vitest)                   |
| `pnpm test:e2e`            | Tests end-to-end (Playwright)            |
| `pnpm db:migrate`          | Aplica migraciones pendientes            |
| `pnpm db:push`             | Sincroniza schema Prisma sin migración   |
| `pnpm db:seed`             | Ejecuta seed                             |
| `pnpm db:studio`           | Abre Prisma Studio (UI para la DB)       |
| `pnpm type-check`          | TypeScript type checking                 |
| `pnpm format`              | Formatea código con Prettier             |

## Variables de entorno esenciales

```bash
# Base de datos
DATABASE_URL="postgresql://myapp:myapp@localhost:5432/myapp_dev"

# Auth (Auth.js v5)
AUTH_SECRET="openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# Stripe (modo test)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Resend (emails)
RESEND_API_KEY="re_..."

# Supabase Storage
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..."

# Sentry (opcional en dev)
SENTRY_DSN=""
```

## Troubleshooting común

- **Puerto 5432 ocupado:** `sudo lsof -i :5432` para ver qué proceso lo usa
- **Migraciones fallan:** borra el volumen `docker compose down -v` y corre `db:migrate` de nuevo
- **Errores de tipado:** corre `pnpm type-check` para diagnosticar
