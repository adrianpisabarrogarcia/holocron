import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PagesService } from './pages.service';

export class PagesController {
  constructor(private pagesService: PagesService) {}

  listPages = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.listPages(request, reply);
  };

  getPage = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.getPage(request, reply);
  };

  createPage = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.createPage(request, reply);
  };

  updatePage = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.updatePage(request, reply);
  };

  deletePage = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.deletePage(request, reply);
  };

  reorderPages = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.reorderPages(request, reply);
  };

  listVersions = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.listVersions(request, reply);
  };

  getVersion = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.getVersion(request, reply);
  };

  restoreVersion = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.pagesService.restoreVersion(request, reply);
  };
}
