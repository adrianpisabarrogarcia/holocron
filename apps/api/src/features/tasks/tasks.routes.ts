import type { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../shared';
import type { TasksController } from './tasks.controller';

export function registerTasksRoutes(app: FastifyInstance, controller: TasksController) {
  app.get('/api/projects/:projectId/tasks', { preHandler: authenticateRequest }, controller.listTasks);
  app.post('/api/projects/:projectId/tasks', { preHandler: authenticateRequest }, controller.createTask);
  app.patch('/api/projects/:projectId/tasks/:taskId', { preHandler: authenticateRequest }, controller.updateTask);
  app.delete('/api/projects/:projectId/tasks/:taskId', { preHandler: authenticateRequest }, controller.deleteTask);
}
