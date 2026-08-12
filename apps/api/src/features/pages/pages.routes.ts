import type { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../shared';
import type { PagesController } from './pages.controller';

export function registerPagesRoutes(app: FastifyInstance, controller: PagesController) {
  app.get('/api/projects/:projectId/pages', { preHandler: authenticateRequest }, controller.listPages);
  app.get('/api/projects/:projectId/pages/:pageId', { preHandler: authenticateRequest }, controller.getPage);
  app.post('/api/projects/:projectId/pages', { preHandler: authenticateRequest }, controller.createPage);
  app.put('/api/projects/:projectId/pages/reorder', { preHandler: authenticateRequest }, controller.reorderPages);
  app.patch('/api/projects/:projectId/pages/:pageId', { preHandler: authenticateRequest }, controller.updatePage);
  app.delete('/api/projects/:projectId/pages/:pageId', { preHandler: authenticateRequest }, controller.deletePage);
  app.get('/api/projects/:projectId/pages/:pageId/versions', { preHandler: authenticateRequest }, controller.listVersions);
  app.get('/api/projects/:projectId/pages/:pageId/versions/:versionId', { preHandler: authenticateRequest }, controller.getVersion);
  app.post('/api/projects/:projectId/pages/:pageId/versions/:versionId/restore', { preHandler: authenticateRequest }, controller.restoreVersion);
}
