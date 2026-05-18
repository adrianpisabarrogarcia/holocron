export type HealthResponse = {
  status: 'ok';
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  taskCount: number;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
};

export type ProjectTasksResponse = {
  project: ProjectSummary;
  tasks: TaskItem[];
};
