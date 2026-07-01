import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../shared';
import type { UsersController } from './users.controller';

export function registerUsersRoutes(app: FastifyInstance, controller: UsersController) {
  app.get('/admin/users', { preHandler: requireAdmin }, controller.listUsers);
  app.post('/admin/users', { preHandler: requireAdmin }, controller.createUser);
}
