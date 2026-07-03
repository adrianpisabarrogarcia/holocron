import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureSeedData, prisma } from '@holocron/db';
import type { HealthResponse } from '@holocron/contracts';

import { uploadsDir, sendError, isProduction } from './shared';

// Import Feature Route Registers, Controllers, and Services
import { registerAuthRoutes } from './features/auth/auth.routes';
import { AuthController } from './features/auth/auth.controller';
import { AuthService } from './features/auth/auth.service';

import { registerProjectsRoutes } from './features/projects/projects.routes';
import { ProjectsController } from './features/projects/projects.controller';
import { ProjectsService } from './features/projects/projects.service';

import { registerSprintsRoutes } from './features/sprints/sprints.routes';
import { SprintsController } from './features/sprints/sprints.controller';
import { SprintsService } from './features/sprints/sprints.service';

import { registerTasksRoutes } from './features/tasks/tasks.routes';
import { TasksController } from './features/tasks/tasks.controller';
import { TasksService } from './features/tasks/tasks.service';

import { registerUsersRoutes } from './features/users/users.routes';
import { UsersController } from './features/users/users.controller';
import { UsersService } from './features/users/users.service';

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const host = '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

mkdirSync(resolve(process.cwd(), uploadsDir), { recursive: true });

const app = Fastify({ logger: true });

await app.register(cors, {
  credentials: true,
  origin: corsOrigin,
});

await app.register(cookie);

await app.register(fastifyStatic, {
  root: resolve(process.cwd(), uploadsDir),
  prefix: '/uploads/',
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  if (reply.sent) {
    return;
  }

  sendError(reply, 500, 'INTERNAL_ERROR', 'Unexpected server error');
});

// Health check endpoint
app.get('/health', async (): Promise<HealthResponse> => {
  await prisma.$queryRaw`SELECT 1`;
  return {
    status: 'ok',
  };
});

// Instantiating services, controllers, and mounting routes
const authService = new AuthService();
const authController = new AuthController(authService);
registerAuthRoutes(app, authController);

const projectsService = new ProjectsService();
const projectsController = new ProjectsController(projectsService);
registerProjectsRoutes(app, projectsController);

const tasksService = new TasksService();
const tasksController = new TasksController(tasksService);
registerTasksRoutes(app, tasksController);

const sprintsService = new SprintsService();
const sprintsController = new SprintsController(sprintsService);
registerSprintsRoutes(app, sprintsController);

const usersService = new UsersService();
const usersController = new UsersController(usersService);
registerUsersRoutes(app, usersController);

await ensureSeedData();
await app.listen({ port, host });
