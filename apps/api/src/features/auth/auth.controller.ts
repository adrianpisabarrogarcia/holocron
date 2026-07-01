import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from './auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.authService.login(request, reply);
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.authService.refresh(request, reply);
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.authService.logout(request, reply);
  };

  me = async (request: FastifyRequest) => {
    return request.authUser;
  };
}
