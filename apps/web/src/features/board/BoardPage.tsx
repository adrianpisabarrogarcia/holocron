import { useState } from 'react';
import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { useBoardStore } from '../../store/useBoardStore';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';

type BoardPageProps = {
  currentProject: ProjectSummary | null;
  onProjectChange: (projectId: string) => Promise<void>;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  tasksByStatus: Array<{ status: TaskSummary['status']; tasks: TaskSummary[] }>;
  userRole: string;
};

export function BoardPage({ currentProject, tasksByStatus, userRole }: BoardPageProps) {
  // Store task actions
  const { createTask, updateTask, deleteTask, moveTask } = useBoardStore();

  // Task creation/editing state
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskSummary['status']>('TODO');

  // Drag and drop visual highlight state
  const [activeLane, setActiveLane] = useState<TaskSummary['status'] | null>(null);

  // Write permissions check
  const isViewer = currentProject?.membershipRole === 'VIEWER';
  const canWrite = !isViewer || userRole === 'ADMIN';

  const openCreateTask = (status: TaskSummary['status']) => {
    if (!canWrite) return;
    setCreateInitialStatus(status);
    setIsTaskCreateOpen(true);
  };

  const handleCreateTask = async (
    title: string,
    desc: string | undefined,
    status: TaskSummary['status'],
    priority: TaskSummary['priority']
  ) => {
    await createTask(title, desc, status, priority);
  };

  const openEditTask = (task: TaskSummary) => {
    if (!canWrite) return;
    setSelectedTask(task);
    setIsTaskEditOpen(true);
  };

  const handleEditTask = async (
    title: string,
    desc: string | undefined,
    status: TaskSummary['status'],
    priority: TaskSummary['priority']
  ) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, title, desc, status, priority);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (confirm(`¿Estás seguro de que quieres eliminar la tarea "${selectedTask.title}"?`)) {
      await deleteTask(selectedTask.id);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canWrite) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskSummary['status']) => {
    if (!canWrite) return;
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, status: TaskSummary['status']) => {
    if (!canWrite) return;
    e.preventDefault();
    setActiveLane(status);
  };

  const handleDragLeave = (status: TaskSummary['status']) => {
    if (activeLane === status) {
      setActiveLane(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskSummary['status']) => {
    if (!canWrite) return;
    e.preventDefault();
    setActiveLane(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await moveTask(taskId, targetStatus);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{currentProject?.name ?? 'Tablero Principal'}</CardTitle>
            <CardDescription>
              {isViewer ? 'Modo de visualización (lectura)' : 'Arrastra tareas entre columnas o haz clic en ellas para modificarlas'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tasksByStatus.map((column) => {
              const isLaneActive = activeLane === column.status;
              return (
                <TaskColumn
                  key={column.status}
                  column={column}
                  isLaneActive={isLaneActive}
                  canWrite={canWrite}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onTaskClick={openEditTask}
                  onAddTask={openCreateTask}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CREATE TASK MODAL */}
      {isTaskCreateOpen && (
        <TaskModal
          isOpen={isTaskCreateOpen}
          onClose={() => setIsTaskCreateOpen(false)}
          task={null}
          initialStatus={createInitialStatus}
          onSave={handleCreateTask}
        />
      )}

      {/* EDIT/DELETE TASK MODAL */}
      {isTaskEditOpen && selectedTask && (
        <TaskModal
          isOpen={isTaskEditOpen}
          onClose={() => setIsTaskEditOpen(false)}
          task={selectedTask}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
