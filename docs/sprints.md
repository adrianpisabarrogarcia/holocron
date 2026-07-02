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

### Cierre

Este roadmap prioriza fundamentos sobre expansion superficial. La plataforma necesita primero una columna estructural solida: identidad, sesion, membresias y permisos. Sobre eso se construye el resto del producto sin improvisacion.
