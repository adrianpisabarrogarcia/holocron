import type { FastifyInstance } from 'fastify';
import type { WorkspacesController } from './workspaces.controller';

export function registerWorkspacesRoutes(app: FastifyInstance, controller: WorkspacesController) {
  // My workspaces (authenticated)
  app.get('/workspaces', controller.listMyWorkspaces);

  // Workspace CRUD
  app.get('/workspaces/:slug', controller.getWorkspace);
  app.post('/workspaces', controller.createWorkspace);
  app.patch('/workspaces/:slug', controller.updateWorkspace);
  app.delete('/workspaces/:slug', controller.deleteWorkspace);

  // Member management (per workspace)
  app.get('/workspaces/:slug/members', controller.listMembers);
  app.post('/workspaces/:slug/members/invite', controller.inviteMember);
  app.patch('/workspaces/:slug/members/:userId', controller.updateMember);
  app.delete('/workspaces/:slug/members/:userId', controller.removeMember);

  // Switch active workspace
  app.post('/workspaces/switch', controller.switchWorkspace);
}
