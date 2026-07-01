import type { FastifyInstance } from 'fastify';
import { authenticateRequest, requireAdmin } from '../../shared';
import type { ProjectsController } from './projects.controller';

export function registerProjectsRoutes(app: FastifyInstance, controller: ProjectsController) {
  app.get('/api/projects', { preHandler: authenticateRequest }, controller.listProjects);
  app.post('/api/projects', { preHandler: authenticateRequest }, controller.createProject);
  app.patch('/api/projects/:projectId', { preHandler: authenticateRequest }, controller.updateProject);
  app.delete('/api/projects/:projectId', { preHandler: authenticateRequest }, controller.deleteProject);

  app.get('/api/projects/:projectId/members', { preHandler: authenticateRequest }, controller.listMembers);
  app.post('/api/projects/:projectId/members', { preHandler: requireAdmin }, controller.addOrUpdateMember);
}
