# Holocron

Minimal monorepo scaffold with a visible first board powered by React, Fastify, Prisma and SQLite.

## Local run

1. `pnpm install`
2. `pnpm db:generate`
3. `pnpm db:push`
4. `pnpm dev:api`
5. In another terminal: `pnpm dev:web`

`pnpm dev:api` injects the local auth defaults required for Sprint 1 and Sprint 2.

Initial local admin credentials:

- Email: `keeper@holocron.local`
- Password: `ChangeMe123!`

The API seeds one sample project with a few tasks on startup when the database is empty, owned by that initial admin.
That same admin is also seeded as `MANAGER` of the demo project so membership-aware reads continue to work immediately.

Sprint 2 local workflow:

1. Log in as the seeded admin.
2. Use `POST /admin/users` to create another user if needed.
3. Use `POST /api/projects/:projectId/members` as admin to assign `MANAGER`, `CONTRIBUTOR`, or `VIEWER`.
4. `GET /api/projects` and `GET /api/projects/:projectId/tasks` return only membership-visible data for non-admin users.

If you prefer explicit environment variables instead of the script defaults, copy `.env.example` into your shell environment before running the commands above.

Useful local checks:

1. `pnpm db:validate`
2. `pnpm db:generate`
3. `pnpm db:push`
4. `pnpm typecheck:db`
5. `pnpm typecheck:api`
6. `pnpm typecheck:web`

## Docker run

Para levantar rápidamente el stack completo en local con Docker y recarga en caliente:

```bash
docker compose up --build
```

Los datos de SQLite y los archivos adjuntos se persisten a través de volúmenes de Docker. Para obtener instrucciones de configuración detalladas, gestión de variables de entorno y guías para el despliegue en entornos de producción real, consulta la [Guía de Despliegue con Docker](docs/docker-deployment.md).
