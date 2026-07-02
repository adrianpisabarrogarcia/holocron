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
  const { createTask, updateTask, deleteTask, moveTask, members } = useBoardStore();

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

          {/* TEAM MEMBERS LIST */}
          {members && members.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Equipo:</span>
              <div className="flex -space-x-2 hover:space-x-1 transition-all duration-300">
                {members.map((m) => {
                  const initials = m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  // Styles for Scrum Role Badge
                  let scrumBadgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                  let scrumLabel = '';
                  if (m.scrumRole === 'DEVELOPER') {
                    scrumBadgeColor = 'bg-sky-100 text-sky-850 dark:bg-sky-950/45 dark:text-sky-355 border border-sky-200/40';
                    scrumLabel = 'Developer';
                  } else if (m.scrumRole === 'PRODUCT_OWNER') {
                    scrumBadgeColor = 'bg-purple-100 text-purple-850 dark:bg-purple-950/45 dark:text-purple-355 border border-purple-200/40';
                    scrumLabel = 'Product Owner';
                  } else if (m.scrumRole === 'SCRUM_MASTER') {
                    scrumBadgeColor = 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/45 dark:text-emerald-355 border border-emerald-200/40';
                    scrumLabel = 'Scrum Master';
                  }

                  const permissionLabel = m.role === 'MANAGER' ? 'Gestor' : m.role === 'CONTRIBUTOR' ? 'Colaborador' : 'Lector';

                  return (
                    <div
                      key={m.userId}
                      className="group relative flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-900 transition-all duration-200 hover:z-30 hover:scale-105 cursor-help"
                    >
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">{initials}</span>

                      {/* TOOLTIP */}
                      <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-250 z-50 flex flex-col gap-1 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-black text-white truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="inline-flex items-center rounded-md bg-slate-800 text-slate-300 border border-slate-700/50 px-1.5 py-0.5 text-[9px] font-medium">
                            {permissionLabel}
                          </span>
                          {scrumLabel && (
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ${scrumBadgeColor}`}>
                              {scrumLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
