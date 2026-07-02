import { useState } from 'react';
import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { useBoardStore } from '../../store/useBoardStore';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';
import { Settings } from 'lucide-react';
import { ManageColumnsModal } from './ManageColumnsModal';

type BoardPageProps = {
  currentProject: ProjectSummary | null;
  onProjectChange: (projectId: string) => Promise<void>;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  tasksByStatus: Array<{ status: TaskSummary['status']; emoji?: string | null; tasks: TaskSummary[] }>;
  userRole: string;
};

export function BoardPage({ currentProject, tasksByStatus, userRole }: BoardPageProps) {
  // Store task actions
  const { createTask, updateTask, deleteTask, moveTask, members, syncColumns } = useBoardStore();

  // Task creation/editing state
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
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
    priority: TaskSummary['priority'],
    isBlocked: boolean,
    blockedReason: string | null
  ) => {
    await createTask(title, desc, status, priority, isBlocked, blockedReason);
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
    priority: TaskSummary['priority'],
    isBlocked: boolean,
    blockedReason: string | null
  ) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, title, desc, status, priority, isBlocked, blockedReason);
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <CardTitle>{currentProject?.name ?? 'Tablero Principal'}</CardTitle>
              {canWrite && currentProject && (
                <button
                  type="button"
                  onClick={() => setIsManageColumnsOpen(true)}
                  className="inline-flex items-center gap-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/40 px-2 py-0.5 text-xs font-bold transition duration-150 active:scale-95 shrink-0"
                  title="Configurar Columnas"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Columnas</span>
                </button>
              )}
            </div>
            <CardDescription>
              {isViewer ? 'Modo de visualización (lectura)' : 'Arrastra tareas entre columnas o haz clic en ellas para modificarlas'}
            </CardDescription>
          </div>

          {/* TEAM MEMBERS LIST */}
          {members && members.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Equipo:</span>
              <div className="flex flex-wrap items-center gap-2">
                {members.map((m) => {
                  const initials = m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  // Styles for Scrum Role Badge
                  let scrumBadgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-350';
                  let scrumLabel = '';
                  let scrumLabelShort = '';
                  if (m.scrumRole === 'DEVELOPER') {
                    scrumBadgeColor = 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-350 dark:border-sky-900/30';
                    scrumLabel = 'Developer';
                    scrumLabelShort = 'DEV';
                  } else if (m.scrumRole === 'PRODUCT_OWNER') {
                    scrumBadgeColor = 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-350 dark:border-purple-900/30';
                    scrumLabel = 'Product Owner';
                    scrumLabelShort = 'PO';
                  } else if (m.scrumRole === 'SCRUM_MASTER') {
                    scrumBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-350 dark:border-emerald-900/30';
                    scrumLabel = 'Scrum Master';
                    scrumLabelShort = 'SM';
                  }

                  const permissionLabel = m.role === 'MANAGER' ? 'Gestor' : m.role === 'CONTRIBUTOR' ? 'Colaborador' : 'Lector';

                  return (
                    <div
                      key={m.userId}
                      className="group relative flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-900/40 pl-1 pr-2.5 py-0.5 border border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 cursor-help"
                    >
                      {/* Avatar circle */}
                      <div className="flex h-5.5 w-5.5 shrink-0 select-none items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-250">
                        {initials}
                      </div>

                      {/* Name */}
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-250">
                        {m.name.split(' ')[0]}
                      </span>

                      {/* Scrum Role Badge */}
                      {scrumLabelShort && (
                        <span className={`rounded px-1 py-0.5 text-[8.5px] font-extrabold border leading-none tracking-wide ${scrumBadgeColor}`}>
                          {scrumLabelShort}
                        </span>
                      )}

                      {/* TOOLTIP */}
                      <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-250 z-50 flex flex-col gap-1 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-black text-white truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="inline-flex items-center rounded-md bg-slate-850 text-slate-300 border border-slate-700/50 px-1.5 py-0.5 text-[9px] font-medium">
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
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-5 min-w-max">
              {tasksByStatus.map((column) => {
                const isLaneActive = activeLane === column.status;
                return (
                  <div key={column.status} className="w-72 shrink-0">
                    <TaskColumn
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
                  </div>
                );
              })}
            </div>
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
          columns={tasksByStatus.map((lane) => lane.status)}
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
          columns={tasksByStatus.map((lane) => lane.status)}
        />
      )}

      {/* MANAGE COLUMNS MODAL */}
      {isManageColumnsOpen && currentProject && (
        <ManageColumnsModal
          isOpen={isManageColumnsOpen}
          onClose={() => setIsManageColumnsOpen(false)}
          columns={currentProject.columns ?? []}
          onSave={async (cols) => {
            await syncColumns(currentProject.id, cols);
          }}
        />
      )}
    </div>
  );
}
