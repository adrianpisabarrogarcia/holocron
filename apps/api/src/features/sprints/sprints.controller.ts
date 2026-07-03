import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SprintsService } from './sprints.service';

export class SprintsController {
  constructor(private service: SprintsService) {}

  listSprints = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.listSprints(request, reply);
    if (result !== undefined) {
      reply.send(result);
    }
  };

  createSprint = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.createSprint(request, reply);
    if (result !== undefined) {
      reply.send(result);
    }
  };

  updateSprint = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.updateSprint(request, reply);
    if (result !== undefined) {
      reply.send(result);
    }
  };

  deleteSprint = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.deleteSprint(request, reply);
    if (result !== undefined) {
      reply.send(result);
    }
  };
}
