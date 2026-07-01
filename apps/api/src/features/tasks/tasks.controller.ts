import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TasksService } from './tasks.service';

export class TasksController {
  constructor(private tasksService: TasksService) {}

  listTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.tasksService.listTasks(request, reply);
  };

  createTask = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.tasksService.createTask(request, reply);
  };

  updateTask = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.tasksService.updateTask(request, reply);
  };

  deleteTask = async (request: FastifyRequest, reply: FastifyReply) => {
    return this.tasksService.deleteTask(request, reply);
  };
}
