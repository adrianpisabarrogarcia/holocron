import type { FastifyInstance } from 'fastify';
import { requireAdmin, authenticateRequest } from '../../shared';
import type { UsersController } from './users.controller';

export function registerUsersRoutes(app: FastifyInstance, controller: UsersController) {
  app.get('/admin/users', { preHandler: requireAdmin }, controller.listUsers);
  app.post('/admin/users', { preHandler: requireAdmin }, controller.createUser);
  app.patch('/admin/users/:userId', { preHandler: requireAdmin }, controller.updateUser);
  app.delete('/admin/users/:userId', { preHandler: requireAdmin }, controller.deleteUser);
  app.post('/admin/users/bulk-import', { preHandler: requireAdmin }, controller.bulkImportUsers);

  app.get('/api/users/profile/notifications', { preHandler: authenticateRequest }, controller.getNotifications);
  app.patch('/api/users/profile/notifications', { preHandler: authenticateRequest }, controller.updateNotifications);
}
