# Guía de Despliegue con Docker

Esta guía explica detalladamente cómo desplegar Holocron (tanto el frontend como la API y la persistencia de base de datos) utilizando **Docker** y **Docker Compose**.

El stack está diseñado con una arquitectura monorrepo basada en `pnpm` workspaces y utiliza SQLite como motor de persistencia ligero.

---

## 📋 Requisitos Previos

Asegúrate de tener instalados en tu máquina:
- **Docker** (versión 20.10 o superior)
- **Docker Compose** (versión 2.0 o superior) o Docker Desktop.

---

## ⚙️ Configuración y Variables de Entorno

Antes de levantar los contenedores, puedes crear un archivo `.env` en la raíz del proyecto para configurar el comportamiento del despliegue. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Las variables principales que gobiernan el despliegue en Docker son:

| Variable | Descripción | Valor por Defecto |
| --- | --- | --- |
| `WEB_PORT` | Puerto público del frontend (React / Vite) | `5173` |
| `API_PORT` | Puerto público del backend (Fastify API) | `4000` |
| `DATABASE_URL` | Ruta de conexión para la base de datos de Prisma | `file:./data/dev.db` |
| `CORS_ORIGIN` | Dirección permitida para peticiones CORS | `http://localhost:5173` |
| `UPLOADS_DIR` | Directorio dentro del contenedor para archivos adjuntos | `/app/storage/uploads` |

---

## 🚀 Despliegue en Desarrollo (Local con Hot-Reload)

El archivo `docker-compose.yml` en la raíz está optimizado para desarrollo local, montando el código fuente como volumen interactivo. Esto permite que cualquier cambio de código en local refresque el contenedor al vuelo.

Para levantar el entorno:

1. **Construir y arrancar los contenedores:**
   ```bash
   docker compose up --build
   ```
   *Este comando compilará las imágenes base, instalará las dependencias en volúmenes aislados, ejecutará la generación del cliente Prisma, aplicará los esquemas pendientes (`prisma db push`) y arrancará los servidores de desarrollo de Vite (puerto 5173) y Fastify (puerto 4000).*

2. **Acceder a la aplicación:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:4000](http://localhost:4000)

3. **Credenciales del Administrador por Defecto:**
   - **Email:** `keeper@holocron.local`
   - **Password:** `ChangeMe123!`

---

## 💾 Persistencia de Datos (Volúmenes de Docker)

Para evitar la pérdida de información al reiniciar o destruir contenedores, el archivo `docker-compose.yml` declara **volúmenes nombrados** de persistencia.

Se definen dos volúmenes de datos críticos:

- `db-data`: Montado en `/app/packages/db/prisma/data`. Persiste el archivo de la base de datos SQLite (`dev.db`).
- `uploads-data`: Montado en `/app/storage/uploads`. Persiste todos los archivos e imágenes WebP comprimidas adjuntas a las tareas y comentarios.

Si necesitas hacer una copia de seguridad o mantenimiento de los datos de desarrollo, los ficheros reales persistirán en tu sistema de archivos Docker local.

---

## 🛡️ Despliegue en Producción (Producción Real)

Para un entorno de producción real, **no se deben utilizar volúmenes de código fuente montados (`./:/app`)** ni comandos de desarrollo. El objetivo es empaquetar el código compilado dentro de la imagen.

A continuación se detalla cómo preparar los archivos para producción.

### 1. Dockerfile de Producción para la API (`apps/api/Dockerfile.prod`)
Crea un flujo multi-etapa para construir un bundle TypeScript ligero:

```dockerfile
# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @holocron/db prisma:generate
RUN pnpm --filter @holocron/api build

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
RUN pnpm install --prod --frozen-lockfile

EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @holocron/db prisma:push && node apps/api/dist/index.js"]
```

### 2. Dockerfile de Producción para la Web (`apps/web/Dockerfile.prod`)
Para el frontend, la práctica recomendada en producción es compilar el bundle estático con Vite y servirlo usando un servidor web de alto rendimiento como **Nginx**:

```dockerfile
# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @holocron/web build

# --- Stage 2: Nginx Serve ---
FROM nginx:1.25-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose de Producción (`docker-compose.prod.yml`)
En producción, tu orquestador invocará los ficheros compilados optimizados sin mapear carpetas locales:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.prod
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      API_PORT: 4000
      CORS_ORIGIN: https://tu-dominio-frontend.com
      DATABASE_URL: file:/app/packages/db/prisma/data/prod.db
    volumes:
      - prod-db-data:/app/packages/db/prisma/data
      - prod-uploads-data:/app/storage/uploads

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile.prod
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  prod-db-data:
  prod-uploads-data:
```

Para levantar este entorno optimizado de producción:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

---

## 🔍 Diagnóstico de Errores Comunes en Docker

1. **Error: `SQLITE_BUSY` o base de datos bloqueada:**
   *Causa:* Ocurre si montas volúmenes que chocan con escrituras locales externas al contenedor de forma concurrente.
   *Solución:* Evita ejecutar comandos de Prisma localmente (`pnpm db:push`) en tu host físico mientras los contenedores de Docker estén activos escribiendo en la misma base de datos.

2. **Los avatares o archivos adjuntos no se visualizan tras reiniciar:**
   *Causa:* No se ha montado el volumen de subidas o la variable de entorno `UPLOADS_DIR` apunta a una ruta incorrecta.
   *Solución:* Asegúrate de tener configurado el volumen `uploads-data` en tu compose mapeando `/app/storage/uploads` dentro del contenedor de la API.
