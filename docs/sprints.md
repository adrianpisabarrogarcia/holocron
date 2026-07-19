## Plan de Producto y Roadmap de Sprints

### Vision de producto

Holocron busca ser una plataforma liviana para gestion de proyectos y tareas orientada a equipos pequenos y medianos que necesitan visibilidad inmediata, reglas de acceso claras y una base tecnica simple de operar. El foco inicial no es competir por cantidad de funcionalidades, sino ofrecer una experiencia consistente para administrar proyectos, tareas y usuarios sin complejidad innecesaria.

La vision del producto es consolidar una base multi-proyecto donde la administracion de usuarios, permisos y operacion sea predecible desde el dia uno. En el MVP, la prioridad es que cada proyecto pueda trabajar con seguridad, trazabilidad basica y una interfaz clara para mover el trabajo.

### MVP

El MVP debe resolver cinco capacidades centrales:

1. Inicio de sesion con autenticacion basada en JWT.
2. Gestion de usuarios controlada unicamente por administradores.
3. Creacion y administracion de proyectos.
4. Tablero/listado de tareas con edicion colaborativa dentro del proyecto.
5. Modelo de permisos simple, entendible y suficientemente estricto.

Resultado esperado del MVP:

1. No existe auto-registro.
2. Solo Admin puede crear usuarios.
3. Cada usuario accede solo a los proyectos donde fue incorporado.
4. En cada proyecto, el rol Contributor puede editar todas las tareas del proyecto durante el MVP.
5. La seguridad de sesion queda resuelta con access token corto y refresh token persistente en cookie segura.

### Base tecnica

La planificacion asume y respeta la base tecnica actual del repositorio:

1. Monorepo con `pnpm` workspaces.
2. Frontend en `apps/web`.
3. Backend en `apps/api`.
4. Persistencia con Prisma y SQLite en `packages/db`.
5. Contratos compartidos en `packages/contracts`.
6. Configuracion compartida en `packages/config`.
7. Ejecucion local y contenedorizada con Docker Compose.

Decisiones tecnicas del MVP:

1. Autenticacion con JWT.
2. Access token con expiracion de 15 minutos.
3. Refresh token con expiracion de 7 dias.
4. Refresh token almacenado en cookie `HttpOnly`.
5. Renovacion de sesion mediante endpoint de refresh dedicado.
6. Autorizacion basada en rol de plataforma y rol por proyecto.
7. Sin dependencia de un proveedor externo de identidad en MVP.

### Roles de plataforma

Los roles de plataforma gobiernan acciones globales del sistema.

#### Admin

1. Puede crear usuarios.
2. Puede activar o desactivar usuarios.
3. Puede crear proyectos.
4. Puede asignar usuarios a proyectos.
5. Puede definir roles por proyecto.
6. Puede ver y operar en todos los proyectos mientras no se defina una restriccion mas fina.

#### Member

1. Puede iniciar sesion.
2. No puede crear usuarios.
3. No puede auto-asignarse a proyectos.
4. Su alcance depende de los roles asignados dentro de cada proyecto.

Nota: para el MVP alcanza con dos roles de plataforma: `Admin` y `Member`. Agregar mas roles globales antes de cerrar fundamentos seria ruido de modelado.

### Roles por proyecto

Los roles por proyecto gobiernan el trabajo cotidiano dentro de cada proyecto.

#### Project Manager

1. Puede ver el proyecto.
2. Puede crear tareas.
3. Puede editar todas las tareas del proyecto.
4. Puede cambiar estados, prioridad y asignaciones.
5. Puede ordenar el backlog y mantener el tablero.

#### Contributor

1. Puede ver el proyecto.
2. Puede crear tareas si el flujo final del MVP lo requiere.
3. Puede editar todas las tareas del proyecto durante el MVP.
4. Puede actualizar estado, descripcion, prioridad y responsables de las tareas del proyecto.

#### Viewer

1. Puede ver el proyecto.
2. No puede crear tareas.
3. No puede editar tareas.

Nota importante del MVP: aunque en una evolucion futura probablemente el Contributor quede restringido a tareas propias o delegadas, durante el MVP se define explicitamente que puede editar todas las tareas del proyecto para priorizar velocidad operativa sobre granularidad.

### Matriz de permisos

| Accion | Admin | Member sin rol de proyecto | Project Manager | Contributor | Viewer |
| --- | --- | --- | --- | --- | --- |
| Iniciar sesion | Si | Si | Si | Si | Si |
| Crear usuarios | Si | No | No | No | No |
| Auto-registro | No | No | No | No | No |
| Crear proyectos | Si | No | No | No | No |
| Asignar usuarios a proyectos | Si | No | No | No | No |
| Definir roles por proyecto | Si | No | No | No | No |
| Ver proyecto asignado | Si | No | Si | Si | Si |
| Crear tareas | Si | No | Si | Si | No |
| Editar cualquier tarea del proyecto | Si | No | Si | Si | No |
| Cambiar estado de tareas | Si | No | Si | Si | No |
| Eliminar tareas | Si | No | Si | Si, si se acepta en MVP | No |
| Ver proyectos no asignados | Si | No | No | No | No |

### Supuestos

1. El producto arranca con un solo tenant logico y varios proyectos dentro de la misma plataforma.
2. SQLite alcanza para desarrollo, demos y primeras validaciones del MVP.
3. La primera necesidad es control de acceso y operacion basica, no automatizaciones avanzadas.
4. Los usuarios seran cargados por administradores internos; no existe flujo publico de alta.
5. La sesion web sera el canal principal en MVP.
6. La cookie `HttpOnly` del refresh token convivira con el access token manejado por la app cliente.
7. La trazabilidad inicial puede resolverse con campos basicos de auditoria y no requiere historial completo desde Sprint 1.

### MVP vs Post-MVP

#### Incluido en MVP

1. Login/logout.
2. Refresh de sesion.
3. Alta de usuarios solo por Admin.
4. Proyectos, membresias y roles por proyecto.
5. CRUD de tareas con permisos del MVP.
6. Vista inicial de tablero o listado operativo.

#### Post-MVP

1. Recuperacion de contrasena.
2. Invitaciones por email.
3. Auditoria completa por evento.
4. Comentarios, adjuntos avanzados y menciones.
5. Restricciones finas por campo o por tarea.
6. Historial de cambios por tarea.
7. Migracion a una base de datos mas robusta si la escala lo exige.
8. SSO o proveedor externo de identidad.

### Roadmap de sprints

#### Sprint 0 - Fundaciones del producto

Objetivo: alinear alcance, lenguaje comun y base operativa.

1. Formalizar vision, MVP y roadmap.
2. Definir roles de plataforma y por proyecto.
3. Acordar modelo inicial de autenticacion y permisos.
4. Revisar estructura del monorepo y convenciones compartidas.
5. Dejar criterios de aceptacion del MVP por escrito.

#### Sprint 1 - Autenticacion, autorizacion y modelo de acceso

Objetivo: dejar resuelto el acceso seguro a la plataforma y el marco de permisos del MVP.

1. Implementar login con JWT.
2. Emitir access token de 15 minutos.
3. Emitir refresh token de 7 dias.
4. Guardar refresh token en cookie `HttpOnly`.
5. Implementar endpoint de refresh.
6. Implementar logout invalidando refresh token segun estrategia elegida.
7. Modelar `Admin` y `Member` como roles de plataforma.
8. Modelar `Project Manager`, `Contributor` y `Viewer` como roles por proyecto.
9. Restringir creacion de usuarios a Admin.
10. Eliminar cualquier posibilidad de self-signup.
11. Garantizar que Contributor pueda editar todas las tareas del proyecto en MVP.

#### Sprint 2 - Usuarios, membresias y administracion basica

Objetivo: permitir que Admin gestione personas y acceso a proyectos.

1. Alta, baja logica y listado de usuarios.
2. Creacion de proyectos.
3. Asignacion de usuarios a proyectos.
4. Definicion de rol por proyecto.
5. Vistas administrativas minimas.

Nota de avance:

1. Se implemento persistencia de membresias por proyecto con roles `MANAGER`, `CONTRIBUTOR` y `VIEWER`.
2. `GET /api/projects` y `GET /api/projects/:projectId/tasks` ya respetan membresias para usuarios `Member`, mientras `Admin` mantiene visibilidad global.
3. Se agregaron endpoints minimos para listar y asignar miembros por proyecto, dejando la UI administrativa grande para una iteracion posterior.
4. Se implementaron los roles Scrum/Equipo (`DEVELOPER`, `PRODUCT_OWNER`, `SCRUM_MASTER`) en la membresía del proyecto (`ProjectMembership`), con soporte en base de datos, tipos de contratos, endpoints API de asignación y visualización interactiva de avatares con tooltip en el Tablero de Tareas (`BoardPage`).
5. Se modificó el nombre del header lateral a "Holocron Workspace" para reflejar adecuadamente el nombre oficial del espacio de trabajo.
6. Se implementó la asignación de usuarios a carpetas completas de proyectos a diferentes niveles de jerarquía (herencia recursiva de membresía), integrándolo en la interfaz de administración mediante un selector de árbol jerárquico que muestra la estructura visual anidada de carpetas y subproyectos, y reflejando las carpetas asignadas con badges verdes en la tabla de administración de usuarios (`/admin/users`).
7. Se diseñó y construyó el panel completo de 'Gestión Accesos' en `/admin/access` con una navegación de árbol jerárquico de carpetas y proyectos en el panel izquierdo y la visualización de los miembros directos en el derecho, permitiendo modificar roles inline, añadir nuevos miembros y revocar accesos en caliente de forma visual e intuitiva. Con ello, se eliminó el antiguo modal redundante de asignación y el botón en el directorio de usuarios para unificar el flujo de trabajo en la nueva sección.
8. Se implementó el flujo completo de edición y borrado de usuarios en la plataforma. En el backend, se añadieron los endpoints `PATCH /admin/users/:userId` y `DELETE /admin/users/:userId`. En la interfaz, se introdujo una columna de Acciones en la tabla del directorio de usuarios (`/admin/users`) con botones para editar (mediante el nuevo modal `EditUserModal` con contraseña opcional) y borrar usuarios directamente (impidiendo que un administrador pueda eliminarse a sí mismo).
9. Se integró la búsqueda de proyectos y carpetas por nombre en el panel de administración. Se añadió un campo de filtrado en tiempo real en la lista de gestión de proyectos (`/admin/projects`) y en la barra de navegación del Centro de Control de Accesos (`/admin/access`).
10. Se implementó la personalización dinámica de estados/columnas con soporte de emojis por proyecto y la opción de bloqueo inline en las tareas. Se incorporó el modelo de base de datos `ProjectColumn` (con el campo opcional `emoji`), migrando el estado fijo 'Bloqueado' de columna a un atributo boolean `isBlocked` con su respectivo `blockedReason` en la tarea. En el backend, se registró la ruta `PUT /api/projects/:projectId/columns` para sincronizar columnas reubicando de forma segura las tareas huérfanas en la primera columna del tablero. En el frontend, se habilitó el botón 'Columnas' en el tablero para abrir el nuevo `ManageColumnsModal` (con entradas individuales de texto para emojis), se modificaron las tarjetas del tablero (`TaskCard`) para reflejar visualmente con un banner rojo el motivo del bloqueo, y se adaptó el modal de tareas (`TaskModal`) para gestionar este estado junto con un desplegable dinámico de estados.
11. Se implementó un editor de texto enriquecido (`RichTextEditor`) como campo de descripción de las tareas. El editor soporta formato de texto (negrita, cursiva, subrayado, citas, bloques de código, listas ordenadas y desordenadas, inserción de enlaces), así como subida de archivos adjuntos e imágenes. Las imágenes se comprimen y convierten a formato WebP en el cliente antes de enviarse al servidor (dimensiones máximas 1200×1200px, calidad 0.7), para minimizar el peso sin necesidad de procesado en el servidor. Los archivos generales se guardan como binarios en `uploads/` y se sirven como recursos estáticos bajo `/uploads/`. En el backend se registró el endpoint `POST /api/tasks/upload` que decodifica el payload base64 y persiste el fichero en disco. Las tarjetas Kanban (`TaskCard`) extraen automáticamente texto plano del HTML de la descripción mediante `DOMParser` para mostrar un preview limpio sin etiquetas.
12. Se refactorizó el sistema de adjuntos y el editor enriquecido. La sección de adjuntos (`AttachmentsSection`) se simplificó a un único botón «Adjuntar» que acepta cualquier tipo de archivo hasta 7 MB (PDF, ZIP, DOCX, vídeos, etc.), detectando automáticamente imágenes por MIME type para comprimirlas a WebP antes de subirlas. Al eliminar un adjunto se llama al nuevo endpoint `DELETE /api/tasks/upload/:filename` que borra el fichero físico del disco con validación de path traversal. El editor de texto enriquecido (`RichTextEditor`) incorporó un botón de imagen en el toolbar y soporte de pegado con Ctrl+V: al detectar una imagen en el portapapeles (captura de pantalla, imagen copiada) la comprime a WebP y la inserta directamente en el cursor. El límite del endpoint de subida se ajustó a 7 MB a nivel de ruta. La función `compressImageToWebp` se exportó desde `AttachmentsSection` para ser reutilizada por el editor sin duplicación.
13. Se implementó la sincronización bidireccional entre el estado de la aplicación y los parámetros de búsqueda de la URL (`project` y `task`). Al seleccionar un proyecto o abrir una tarea en el tablero, la URL se actualiza automáticamente (`/board?project=ID&task=ID`), lo que permite que al recargar o compartir la URL, el sistema se posicione en el proyecto correspondiente y abra la modal de la tarea deseada de forma automática. Además, se añadieron botones de «Copiar enlace» con confirmación visual rápida (icono de check verde temporal) tanto en la cabecera superior del proyecto (para compartir la vista actual del dashboard o tablero) como en el pie de la modal de edición de tareas.
14. Se implementó la asignación y propiedad múltiple de personas en las tareas. En la base de datos se añadieron relaciones muchos a muchos (`TaskOwners` y `TaskAssignees`) entre `User` y `Task`. En el backend, se adaptaron los endpoints `GET /projects/:projectId/tasks`, `POST /projects/:projectId/tasks` y `PATCH /projects/:projectId/tasks/:taskId` para gestionar y retornar listas de propietarios (`owners`) y asignados (`assignees`). En el frontend, se actualizaron el store de Zustand y la modal de edición de tareas (`TaskModal`) agregando dos paneles interactivos con listas de selección (checkboxes) de miembros del proyecto para asignar múltiples propietarios o responsables. Por último, en las tarjetas del tablero Kanban (`TaskCard`) se renderizan ahora los avatares/iniciales mini de todos los owners (color ámbar) y asignados (color índigo) para brindar visibilidad directa del equipo.
21. Se integró la carga e integración de avatares y fotos de perfil en la vista de administración (`/admin/users`), mostrando la miniatura de la foto en la tabla y añadiendo la previsualización y subida interactiva desde el modal de edición de usuarios.
22. Se creó la modal de perfil del usuario logueado (`ProfileModal.tsx`), accesible desde el sidebar, bloqueando la edición de Nombre y Email (restringidos a administrador), y habilitando el cambio de contraseña con doble validación en tiempo real e indicador de fortaleza de contraseña segmentado visualmente.
23. Se reemplazó la entrega de correos por Nodemailer SMTP integrado con Google Workspace (App Passwords) y soporte de archivos de entorno `.env` dinámicos por CWD local para simular envíos reales en desarrollo.
24. Se agregaron botones de acción y enlaces interactivos a las 5 plantillas HTML de correo, redirigiendo de forma interactiva a `/board?project=ID` o `/sprints?project=ID` según corresponda para agilizar la interacción del usuario.
25. Se implementaron los disparadores de correo para menciones en comentarios (patrón `@nombre`) y alertas de tareas marcadas como bloqueadas, enviando notificaciones detalladas y estilizadas en tiempo real a los involucrados.
26. Se solucionó el problema de burbujeo de eventos de arrastre de tareas en `/sprints` implementando `stopPropagation`, lo que independizó el movimiento de tareas individuales del reordenado de sprints y habilitó el drag-and-drop de vuelta al Backlog general.

#### Sprint 3 - Dominio de tareas

Objetivo: cubrir el ciclo basico de trabajo dentro de un proyecto.

1. Crear, editar y eliminar tareas.
2. Estados iniciales de workflow.
3. Prioridad, descripcion y responsable.
4. Validacion de permisos por proyecto.

#### Sprint 4 - Tablero operativo

Objetivo: mejorar visibilidad y uso diario del producto.

1. Vista de tablero o columnas por estado.
2. Listado alternativo de tareas.
3. Filtros basicos por estado y responsable.
4. Ajustes UX para operacion rapida.

#### Sprint 5 - Estabilidad funcional y auditoria minima

Objetivo: endurecer el producto antes de ampliar alcance.

1. Manejo consistente de errores.
2. Validaciones de backend y frontend.
3. Campos de auditoria basicos.
4. Reglas de seguridad adicionales para sesion y permisos.

#### Sprint 6 - Colaboracion inicial

Objetivo: enriquecer el flujo de trabajo sin cambiar fundamentos.

1. Comentarios basicos en tareas.
2. Actividad reciente por proyecto.
3. Mejora de navegacion entre proyecto y tareas.

#### Sprint 7 - Operacion multi-proyecto

Objetivo: consolidar experiencia para usuarios con varios proyectos.

1. Selector de proyectos.
2. Mejoras de contexto global.
3. Vistas resumidas por proyecto.

#### Sprint 8 - Endurecimiento tecnico

Objetivo: preparar la plataforma para crecer sin deuda peligrosa.

1. Observabilidad basica.
2. Refactor de contratos compartidos si hace falta.
3. Revisión de persistencia y migraciones.
4. Ajustes de performance en consultas y payloads.

#### Sprint 9 - Preparacion post-MVP

Objetivo: cerrar aprendizajes del MVP y decidir la siguiente inversion.

1. Medir uso real de permisos y workflow.
2. Priorizar features post-MVP.
3. Evaluar restricciones finas para Contributor.
4. Evaluar invitaciones, recuperacion de password y auditoria expandida.

### Plan detallado de Sprint 1

#### Objetivo del sprint

Construir la capa de autenticacion y autorizacion del MVP sobre la base tecnica existente, con reglas claras de sesion, administracion de usuarios y permisos por proyecto.

#### Decisiones cerradas del sprint

1. La autenticacion sera con JWT.
2. El access token durara 15 minutos.
3. El refresh token durara 7 dias.
4. El refresh token se almacenara en cookie `HttpOnly`.
5. Solo Admin podra crear usuarios.
6. No existira self-signup.
7. Contributor podra editar todas las tareas del proyecto durante el MVP.

#### Alcance funcional

1. Pantalla o flujo de login.
2. Endpoint de autenticacion.
3. Endpoint de refresh de sesion.
4. Endpoint de logout.
5. Middleware de autenticacion para rutas protegidas.
6. Middleware o capa de autorizacion por rol.
7. CRUD minimo de usuarios para Admin, al menos en creacion.
8. Modelo de membresia entre usuario y proyecto.
9. Politicas de permiso aplicadas sobre tareas.

#### Historias principales

1. Como usuario existente, quiero iniciar sesion para acceder a mis proyectos.
2. Como sistema, quiero renovar sesiones sin exponer el refresh token al JavaScript del navegador.
3. Como Admin, quiero crear usuarios para controlar quien entra a la plataforma.
4. Como usuario sin privilegios de administracion, no quiero ver ni usar flujos de alta de usuarios.
5. Como Contributor, quiero editar cualquier tarea de mi proyecto durante el MVP para no frenar la operacion.

#### Entregables tecnicos

1. Modelo de datos para usuarios, sesiones o tokens persistidos si se requiere revocacion, proyectos y membresias.
2. Contratos compartidos para login, refresh y usuario autenticado.
3. Middleware backend para validar JWT y resolver identidad.
4. Capa de autorizacion basada en rol global y rol por proyecto.
5. Flujo frontend para guardar estado autenticado y refrescar sesion.
6. Manejo de expiracion de access token y reintento via refresh.
7. Pantallas o vistas minimas para Admin en creacion de usuarios.

#### Tareas backend

1. Definir entidades necesarias en Prisma: `User`, `Project`, `ProjectMember` y soporte de refresh token segun estrategia seleccionada.
2. Modelar rol de plataforma en usuario.
3. Modelar rol por proyecto en la tabla de membresia.
4. Implementar endpoint `POST /auth/login`.
5. Implementar endpoint `POST /auth/refresh`.
6. Implementar endpoint `POST /auth/logout`.
7. Firmar JWT con expiracion de 15 minutos.
8. Emitir refresh token con expiracion de 7 dias.
9. Enviar refresh token en cookie `HttpOnly`.
10. Evaluar flags `Secure` y `SameSite` segun entorno local vs despliegue.
11. Proteger endpoint de creacion de usuarios para Admin solamente.
12. Rechazar cualquier endpoint publico de registro de usuarios.
13. Crear guardas de acceso para recursos de proyecto.
14. Permitir a Contributor editar cualquier tarea del proyecto en la politica del MVP.

#### Tareas frontend

1. Crear formulario de login.
2. Enviar credenciales al backend y almacenar solo el access token o el estado derivado necesario.
3. Consumir refresh de forma transparente cuando expire el access token.
4. Limpiar sesion local al fallar refresh o logout.
5. Ocultar o no renderizar acciones de administracion para usuarios no Admin.
6. Respetar permisos de edicion de tareas segun membresia del proyecto.
7. Mostrar estados de error de login y sesion expirada de forma clara.

#### Tareas de seguridad

1. Hashear passwords con algoritmo robusto.
2. No exponer refresh token en `localStorage` ni en JavaScript.
3. Validar expiracion y firma de tokens en cada request protegida.
4. Definir estrategia de revocacion o rotacion de refresh tokens.
5. Evitar respuestas ambiguas en errores de autenticacion.
6. Revisar CORS y credenciales para permitir cookie segura en entorno web.

#### Tareas de producto y UX

1. Definir mensaje claro de acceso denegado.
2. Definir comportamiento ante sesion vencida.
3. Definir primer flujo de alta manual de usuarios por Admin.
4. Confirmar si la pantalla inicial post-login sera tablero global o ultimo proyecto.

#### Criterios de aceptacion

1. Un usuario valido puede iniciar sesion y obtener acceso a la aplicacion.
2. El access token expira a los 15 minutos y la sesion puede renovarse con refresh token valido.
3. El refresh token expira a los 7 dias.
4. El refresh token viaja en cookie `HttpOnly`.
5. No existe una ruta publica de registro.
6. Solo Admin puede crear usuarios.
7. Un Contributor asignado a un proyecto puede editar cualquier tarea de ese proyecto.
8. Un usuario fuera del proyecto no puede leer ni editar tareas de ese proyecto.

#### Dependencias y orden recomendado

1. Modelo de datos.
2. Endpoints y middleware de auth.
3. Politicas de autorizacion.
4. Pantalla de login y manejo de sesion.
5. Flujos Admin de creacion de usuarios.
6. Validacion integral de permisos sobre tareas.

#### Riesgos del sprint

1. Mezclar autenticacion y autorizacion en la misma capa puede ensuciar el diseno.
2. Resolver mal la renovacion de sesion puede generar loops silenciosos en frontend.
3. Si no se modela bien la membresia, los permisos por proyecto quedan fragiles.
4. Si el refresh token no tiene estrategia de revocacion, logout y seguridad quedan incompletos.

#### Definicion de terminado de Sprint 1

Sprint 1 se considera terminado cuando el producto ya no depende de usuarios hardcodeados o acceso libre, cuando Admin puede dar de alta usuarios reales, cuando la sesion se mantiene con refresh token seguro y cuando las reglas de acceso por proyecto estan aplicadas en tareas con el comportamiento especificado para Contributor en MVP.

### Riesgos generales

1. SQLite puede quedarse corto si se incrementa mucho la concurrencia o el volumen antes de tiempo.
2. Un modelo de permisos demasiado simple puede requerir migracion conceptual post-MVP.
3. Si se agregan features antes de cerrar auth y membresias, la deuda de seguridad crece rapido.
4. La diferencia entre rol global y rol por proyecto debe reflejarse con nitidez en backend y frontend para evitar inconsistencias.
5. La experiencia con cookies, CORS y entornos locales puede generar friccion si no se prueba temprano.

### Sprint 3 - Evoluciones de Autenticación, Seguridad y Vistas Avanzadas

Este sprint introduce mejoras sustanciales en la seguridad, la usabilidad de la planificación temporal y el control operativo del tablero.

#### 1. Autenticación sin Contraseñas (Passwordless Magic Links)
*   **Decisión**: Se ha eliminado por completo el sistema tradicional de contraseñas de la plataforma para simplificar el flujo y aumentar la seguridad.
*   **Mecanismo**: El login ahora genera un token JWT temporal de un solo uso con una expiración estricta de **5 minutos** firmado con la clave privada de refresh del backend. Este token se envía por correo electrónico transaccional (HTML corporativo con botón de acceso).
*   **Prevención de Enumeración**: La API responde con un mensaje genérico de éxito sin indicar si el correo existe o no, mitigando ataques de fuerza bruta o escaneo de cuentas.
*   **Usuario por Defecto**: Se ha configurado la dirección `adrian.pisabarro.garcia@gmail.com` como el correo preestablecido de administración en las semillas del sistema.

#### 2. Vistas Avanzadas de Tareas (Cronograma y Gantt)
*   **Diagrama de Cascada (Gantt)**: Vista temporal de tareas que dibuja barras horizontales interactivas basadas en `startDate` y `endDate`. Las fechas pueden ser modificadas en línea directamente desde la tabla de tareas y se redibujan de forma reactiva.
*   **Calendario Mensual**: Cuadrícula interactiva mensual que visualiza las tareas activas de cada día clasificadas con colores según su estado actual.
*   **Filtros Dinámicos**: Barra de filtrado avanzado que permite buscar tareas en tiempo real por texto, estado, prioridad y sprint (incluyendo backlog general). El eje temporal del Gantt se reajusta automáticamente al rango de las tareas filtradas.

#### 3. Ordenamiento Manual en Kanban
*   **Drag-and-Drop de Tarjetas**: Se ha habilitado la ordenación personalizada de tareas dentro de la misma columna arrastrando una tarea y soltándola encima de otra específica.
*   **Persistencia**: El orden personalizado se almacena en el `localStorage` del navegador mapeado por proyecto y estado de columna, manteniendo la estructura tras refrescar la aplicación.

#### 4. Seguridad de la API (Rate Limiting y Helmet)
*   **Cabeceras Seguras**: Registro de `@fastify/helmet` para forzar cabeceras HTTP robustas recomendadas por OWASP (prevención de iframe clickjacking, sniffing, referrers, etc.).
*   **Límite de Peticiones**: Registro de `@fastify/rate-limit` configurado a un máximo de **150 peticiones por minuto por IP** para mitigar ataques DDoS y abusos de llamadas automáticas en endpoints críticos de correo.

### Sprint 4 - Aislamiento Multi-Tenant (Workspaces)

Este sprint introduce el soporte de múltiples espacios de trabajo aislados (Workspaces), permitiendo separar proyectos, carpetas, miembros y configuraciones de acceso de forma estricta.

#### 1. Aislamiento e Independencia Completa
* **Aislamiento de proyectos y carpetas**: Todos los proyectos y carpetas están vinculados a un `workspaceId`. Los endpoints de la API filtran rigurosamente por el workspace activo en sesión.
* **Control de Semilla (`seed`)**: Se configuró la inicialización automática de base de datos para no recrear el workspace `default` si ya existen otros en el sistema.
* **Gitignore recursivo**: Se protegió el repositorio configurando el `.gitignore` para ignorar bases de datos (`*.db`) y archivos subidos (`storage/uploads`) de manera recursiva en todo el monorepo.

#### 2. Navegación y Rutas Dinámicas
* **AppRouter y URLs por Workspace**: Las vistas de la aplicación se enrutan bajo `/workspace/:slug/*` (ej: `/workspace/teknei/overview`).
* **WorkspaceSwitcher**: Componente interactivo en el header lateral que permite cambiar de workspace.
* **Navegación dinámica**: El sidebar resuelve dinámicamente las rutas al workspace actual. Si se cambia de workspace desde secciones globales de administración, el usuario se mantiene en la misma pantalla en lugar de ser redirigido.

#### 3. Gestión y Asignación de Usuarios
* **Directorio de Cuentas**: Se añadió una columna "Workspaces" a la tabla de administración de usuarios.
* **Formularios con casillas**: Los modales de creación y edición de usuarios ahora permiten asignar al usuario a múltiples workspaces al instante marcando casillas de verificación.
* **Upsert en Registro**: Registrar a un usuario que ya había sido invitado a un workspace actualiza su perfil en la plataforma y sincroniza sus workspaces en lugar de arrojar error de duplicidad.

#### 4. Seguridad
* **Protección a Superadmins**: Solo los usuarios con rol de `SUPERADMIN` pueden borrar a otros Superadministradores. Los administradores estándar (`ADMIN`) no tienen visualización del botón de borrado en la UI ni autorización a nivel de API (403 Forbidden).
* **Historial de inicio de sesión**: Habilitados los atributos nativos de autocompletado del navegador (`autoComplete`, `name`, `id`) y un listado dinámico de accesos recientes persistidos en `localStorage` (píldoras clicables para autocompletado inmediato).

### Cierre

Este roadmap prioriza fundamentos sobre expansion superficial. La plataforma cuenta ahora con una columna estructural sólida: soporte multi-tenant con workspaces aislados, identidad segura sin contraseñas, vistas avanzadas de planificación visual (Gantt/Calendario) con ordenación interactiva, y un backend protegido frente a abusos.

### Sprint 5 - Control de Accesos, Notificaciones Jira, Clasificación de Tareas y Menciones en Editor

Este sprint consolida la seguridad operativa de los workspaces, el sistema de notificaciones transaccionales por email y enriquece la experiencia de usuario en el tablero y el editor colaborativo.

#### 1. Seguridad y Control de Accesos
* **Restricción a Miembros Estándar:** Modificado el backend (`projects.service.ts`) para denegar la creación de proyectos a usuarios con rol `MEMBER` (403 Forbidden). En el frontend, se oculta el formulario `CreateProjectCard` y el botón "Nuevo" para usuarios sin permisos de administración, adaptando los mensajes del dashboard.
* **Aislamiento del Selector de Workspaces:** Corregida la fuga de estado global de Zustand al cerrar sesión. Se implementó una acción `resetWorkspaces` en `useWorkspaceStore.ts` que se invoca en el logout de `useAuthStore.ts`, garantizando que un usuario no pueda ver los workspaces del usuario que inició sesión previamente.

#### 2. Sistema de Notificaciones por Email (Estilo Jira)
* **Preferencia de Notificaciones en Cascada:** Creados los modelos `NotificationPreference` (global) y `ProjectNotificationPreference` (por proyecto) en `schema.prisma`. El motor de resolución en `EmailService` evalúa la preferencia específica de proyecto y, si no está definida, hereda la configuración global de la cuenta (por defecto `true`).
* **Exclusión de Remitente:** El backend filtra automáticamente al autor del evento para evitar enviarle notificaciones por correo a sí mismo.
* **Interfaz de Gestión de Alertas:** Integrada una pestaña "Notificaciones" en el perfil de usuario (`ProfileModal.tsx`) y una campana 🔔 interactiva con el modal `ProjectNotificationModal.tsx` tanto en la vista del tablero (`BoardPage.tsx`) como en la vista de proyectos (`OverviewPage.tsx`).
* **URLs de Acción Completas:** Corregidos todos los enlaces generados en los correos (`sendMentionEmail`, `sendTaskCreatedEmail`, `sendTaskAssignedEmail`, etc.) para que apunten a la ruta del workspace `/workspace/:slug/board?project=:projectId&task=:taskId`, abriendo el modal de la tarea concreta directamente al hacer clic.

#### 3. Clasificación de Tareas (Gestión vs Desarrollo)
* **Tipado y Persistencia:** Añadido el campo `type` con valor por defecto `"DEVELOPMENT"` en el modelo `Task` de la base de datos SQLite y al tipado `TaskSummary` del paquete de contratos compartidos.
* **Selector Segmentado en UI:** Añadida una botonera segmentada premium en `TaskModal.tsx` para alternar fluidamente entre "Desarrollo" y "Gestión".
* **Visualización en Kanban:** Diseñados dos badges translúcidos elegantes en `TaskCard.tsx` para distinguir el tipo de tarea al primer golpe de vista:
  - 💻 **Desarrollo:** Color azul/índigo (`bg-indigo-50/70 text-indigo-700 border-indigo-200`).
  - 📋 **Gestión:** Color verde/esmeralda (`bg-emerald-50/70 text-emerald-700 border-emerald-200`).

#### 4. Autocompletado de Menciones `@` en Editores
* **Dropdown Inteligente bajo el Cursor:** Modificado el `RichTextEditor` para procesar la lista de miembros del proyecto. Se desarrolló un parser basado en la API de Selección y Rangos nativa del navegador para detectar `@...` y anclar de forma absoluta un desplegable de sugerencias flotante justo debajo del cursor de texto en tiempo real.
* **Navegación e Inserción Fluidas:** Soporte para navegar la lista de miembros con las flechas del teclado (`ArrowUp` / `ArrowDown`), confirmar con `Enter` o `Tab` e inyectar un badge de mención no editable (`contenteditable="false"`) seguido de un espacio no separable para continuar redactando.

