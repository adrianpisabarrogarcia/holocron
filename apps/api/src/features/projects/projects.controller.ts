import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProjectsService } from './projects.service';

export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  listProjects = async (request: FastifyRequest) => {
    return this.projectsService.listProjects(request);
  };

  createProject = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.createProject(request, reply);
  };

  updateProject = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.updateProject(request, reply);
  };

  deleteProject = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.deleteProject(request, reply);
  };

  listMembers = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.listMembers(request, reply);
  };

  addOrUpdateMember = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.addOrUpdateMember(request, reply);
  };

  addOrUpdateFolderMember = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.addOrUpdateFolderMember(request, reply);
  };

  listFolders = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.listFolders(request, reply);
  };

  createFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.createFolder(request, reply);
  };

  deleteFolder = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.deleteFolder(request, reply);
  };

  removeMember = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.removeMember(request, reply);
  };

  removeFolderMember = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.removeFolderMember(request, reply);
  };

  listFolderMembers = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.listFolderMembers(request, reply);
  };

  syncProjectColumns = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.projectsService.syncProjectColumns(request, reply);
  };
}
