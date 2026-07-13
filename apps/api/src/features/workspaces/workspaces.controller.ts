import type { FastifyReply, FastifyRequest } from 'fastify';
import type { WorkspacesService } from './workspaces.service';

export class WorkspacesController {
  constructor(private service: WorkspacesService) {}

  listMyWorkspaces = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.listMyWorkspaces(request, reply);

  getWorkspace = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.getWorkspace(request, reply);

  createWorkspace = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.createWorkspace(request, reply);

  updateWorkspace = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.updateWorkspace(request, reply);

  deleteWorkspace = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.deleteWorkspace(request, reply);

  listMembers = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.listMembers(request, reply);

  inviteMember = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.inviteMember(request, reply);

  updateMember = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.updateMember(request, reply);

  removeMember = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.removeMember(request, reply);

  switchWorkspace = (request: FastifyRequest, reply: FastifyReply) =>
    this.service.switchWorkspace(request, reply);
}
