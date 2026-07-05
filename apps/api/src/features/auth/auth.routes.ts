import type { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../shared';
import type { AuthController } from './auth.controller';

export function registerAuthRoutes(app: FastifyInstance, controller: AuthController) {
  app.post('/auth/login', controller.login);
  app.post('/auth/magic-login', controller.magicLogin);
  app.post('/auth/refresh', controller.refresh);
  app.post('/auth/logout', controller.logout);
  app.get('/auth/me', { preHandler: authenticateRequest }, controller.me);
  app.patch('/auth/profile', { preHandler: authenticateRequest }, controller.updateProfile);
}
