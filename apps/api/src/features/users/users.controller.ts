import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UsersService } from './users.service';

export class UsersController {
  constructor(private usersService: UsersService) {}

  listUsers = async (_request: FastifyRequest, _reply: FastifyReply) => {
    return this.usersService.listUsers();
  };

  createUser = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.usersService.createUser(request, reply);
  };

  updateUser = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.usersService.updateUser(request, reply);
  };

  deleteUser = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.usersService.deleteUser(request, reply);
  };

  bulkImportUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.usersService.bulkImportUsers(request, reply);
  };
}
