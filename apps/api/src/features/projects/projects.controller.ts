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
}
