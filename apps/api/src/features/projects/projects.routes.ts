import type { FastifyInstance } from 'fastify';
import { authenticateRequest, requireAdmin } from '../../shared';
import type { ProjectsController } from './projects.controller';

export function registerProjectsRoutes(app: FastifyInstance, controller: ProjectsController) {
  app.get('/api/projects', { preHandler: authenticateRequest }, controller.listProjects);
  app.post('/api/projects', { preHandler: authenticateRequest }, controller.createProject);
  app.patch('/api/projects/:projectId', { preHandler: authenticateRequest }, controller.updateProject);
  app.delete('/api/projects/:projectId', { preHandler: authenticateRequest }, controller.deleteProject);
  app.put('/api/projects/:projectId/columns', { preHandler: authenticateRequest }, controller.syncProjectColumns);

  app.get('/api/projects/:projectId/members', { preHandler: authenticateRequest }, controller.listMembers);
  app.post('/api/projects/:projectId/members', { preHandler: requireAdmin }, controller.addOrUpdateMember);

  app.get('/api/folders', { preHandler: authenticateRequest }, controller.listFolders);
  app.post('/api/folders', { preHandler: authenticateRequest }, controller.createFolder);
  app.delete('/api/folders/:folderId', { preHandler: authenticateRequest }, controller.deleteFolder);
  app.post('/api/folders/:folderId/members', { preHandler: requireAdmin }, controller.addOrUpdateFolderMember);
  app.get('/api/folders/:folderId/members', { preHandler: requireAdmin }, controller.listFolderMembers);

  app.delete('/api/projects/:projectId/members/:userId', { preHandler: requireAdmin }, controller.removeMember);
  app.delete('/api/folders/:folderId/members/:userId', { preHandler: requireAdmin }, controller.removeFolderMember);

  app.get('/api/projects/:projectId/notifications', { preHandler: authenticateRequest }, controller.getNotifications);
  app.patch('/api/projects/:projectId/notifications', { preHandler: authenticateRequest }, controller.updateNotifications);
}
