# Arquitectura de Holocron

Este documento detalla los pilares arquitectónicos, la estructura técnica y el modelo de seguridad implementados en Holocron.

---

## Estructura del Monorepo

Holocron está estructurado como un monorepo gestionado mediante **pnpm workspaces**:

```mermaid
graph TD
    subgraph Aplicaciones [Aplicaciones (apps/)]
        web[web: React Single Page Application]
        api[api: Fastify Backend]
    end

    subgraph Paquetes [Paquetes Compartidos (packages/)]
        db[db: SQLite + Prisma ORM]
        contracts[contracts: Contratos & DTOs]
        config[config: Configuración Común]
    end

    web --> contracts
    api --> contracts
    api --> db
```

*   **`apps/web`**: Single Page Application (SPA) construida con React, TypeScript y TailwindCSS. Administra el estado global de forma reactiva en el cliente.
*   **`apps/api`**: Servidor API RESTful ligero impulsado por Fastify y TypeScript.
*   **`packages/db`**: Capa de persistencia que interactúa con una base de datos SQLite local a través de Prisma Client.
*   **`packages/contracts`**: Contratos de datos y tipos compartidos para asegurar la integridad de datos entre cliente y servidor.

---

## Arquitectura de Seguridad

La seguridad en Holocron se gestiona mediante un enfoque de capas defensivas en el servidor y políticas estrictas de cookies en el cliente.

### 1. Autenticación sin Contraseñas (Passwordless Magic Links)
*   **Identificación**: El usuario ingresa su dirección de correo electrónico en la vista de login.
*   **Generación de Token**: El servidor genera un token JWT efímero firmado digitalmente con una vigencia de **5 minutos**.
*   **Entrega**: El token se envía por correo electrónico en forma de Magic Link a través de Nodemailer SMTP.
*   **Prevención de Enumeración**: La API responde siempre de manera genérica para evitar que atacantes externos descubran si un email existe o no en el sistema.
*   **Sesiones de Larga Duración**: Tras verificar el Magic Link, el servidor emite:
    *   Un `Access Token` JWT temporal enviado en el cuerpo de la respuesta con expiración de **5 minutos**.
    *   Un `Refresh Token` JWT de **10 horas** configurado dentro de una cookie de servidor segura (`HttpOnly`, `Secure`, `SameSite=Lax`).

### 2. Protección contra Abusos (Rate Limiting)
Para prevenir ataques de denegación de servicio (DDoS), escaneos automatizados y abuso en la generación de correos electrónicos, se ha integrado `@fastify/rate-limit`:
*   **Límite Máximo**: **150 solicitudes por minuto por IP**.
*   **Respuesta de Exceso**: Retorna HTTP `429 Too Many Requests` con una estructura de error estandarizada para alertar al cliente.

### 3. Cabeceras de Seguridad HTTP (Helmet)
El backend utiliza `@fastify/helmet` para inyectar cabeceras HTTP de seguridad recomendadas por OWASP:
*   `X-DNS-Prefetch-Control`: Previene la fuga de resolución DNS de enlaces externos.
*   `X-Frame-Options: SAMEORIGIN`: Protege contra ataques de Clickjacking.
*   `X-Content-Type-Options: nosniff`: Evita que los navegadores intenten interpretar tipos de archivos incorrectos (MIME sniffing).
*   `Referrer-Policy: no-referrer`: Evita el envío de información sobre la procedencia de las llamadas.

### 4. Modelo de Autorización y Permisos
El sistema utiliza una validación jerárquica cruzando el rol de plataforma (`Admin`, `Member`) y el rol asignado a la membresía del proyecto (`MANAGER`, `CONTRIBUTOR`, `VIEWER`):
*   El rol `Admin` tiene privilegios de superusuario global.
*   Las rutas sensibles del proyecto en el backend verifican que el usuario solicitante pertenezca al proyecto y cuente con permisos de escritura antes de procesar cualquier mutación (creación, edición o eliminación de tareas).
