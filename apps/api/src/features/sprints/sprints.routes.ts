import type { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../shared';
import type { SprintsController } from './sprints.controller';

export function registerSprintsRoutes(app: FastifyInstance, controller: SprintsController) {
  app.get('/api/projects/:projectId/sprints', { preHandler: authenticateRequest }, controller.listSprints);
  app.post('/api/projects/:projectId/sprints', { preHandler: authenticateRequest }, controller.createSprint);
  app.patch('/api/projects/:projectId/sprints/:sprintId', { preHandler: authenticateRequest }, controller.updateSprint);
  app.delete('/api/projects/:projectId/sprints/:sprintId', { preHandler: authenticateRequest }, controller.deleteSprint);
}
