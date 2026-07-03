import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { useBoardStore } from '../../store/useBoardStore';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';
import { useAuthStore } from '../../store/useAuthStore';
import { Settings, Search, SlidersHorizontal, Filter, X } from 'lucide-react';
import { ManageColumnsModal } from './ManageColumnsModal';

type BoardPageProps = {
  currentProject: ProjectSummary | null;
  onProjectChange: (projectId: string) => Promise<void>;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  tasksByStatus?: Array<{ status: TaskSummary['status']; emoji?: string | null; tasks: TaskSummary[] }>;
  userRole: string;
};

export function BoardPage({ currentProject, userRole }: BoardPageProps) {
  // Store task actions
  const { tasks, sprints, createTask, updateTask, deleteTask, moveTask, members, syncColumns } = useBoardStore();
  const { user } = useAuthStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const taskParam = searchParams.get('task');

  // Task creation/editing state
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskSummary['status']>('TODO');
  const [sprintFilter, setSprintFilter] = useState<string>('active');

  // Visualization filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [blockedFilter, setBlockedFilter] = useState<string>('all');

  // Drag and drop visual highlight state
  const [activeLane, setActiveLane] = useState<TaskSummary['status'] | null>(null);

  // Write permissions check
  const isViewer = currentProject?.membershipRole === 'VIEWER';
  const canWrite = !isViewer || userRole === 'ADMIN';

  const activeSprint = sprints.find(s => s.status === 'ACTIVE');
  const currentSprintIdForNewTask = 
    sprintFilter === 'active' ? (activeSprint?.id ?? null) :
    sprintFilter === 'backlog' ? null :
    sprintFilter === 'all' ? null :
    sprintFilter;

  const filteredTasks = tasks.filter(task => {
    // 1. Sprint filter
    if (sprintFilter === 'active') {
      if (activeSprint && task.sprintId !== activeSprint.id) return false;
      if (!activeSprint && task.sprintId) return false;
    } else if (sprintFilter === 'backlog') {
      if (task.sprintId) return false;
    } else if (sprintFilter !== 'all') {
      if (task.sprintId !== sprintFilter) return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc) return false;
    }

    // 3. Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    // 4. Member filter (Owners or Assignees)
    if (memberFilter === 'mine') {
      const isOwner = task.owners?.some(o => o.id === user?.id);
      const isAssignee = task.assignees?.some(a => a.id === user?.id);
      if (!isOwner && !isAssignee) return false;
    } else if (memberFilter !== 'all') {
      const isOwner = task.owners?.some(o => o.id === memberFilter);
      const isAssignee = task.assignees?.some(a => a.id === memberFilter);
      if (!isOwner && !isAssignee) return false;
    }

    // 5. Blocked filter
    if (blockedFilter === 'blocked' && !task.isBlocked) return false;
    if (blockedFilter === 'unblocked' && task.isBlocked) return false;

    return true;
  });

  const columnsList = currentProject?.columns ?? [];
  const localTasksByStatus = columnsList.map(col => ({
    status: col.name,
    emoji: col.emoji || null,
    tasks: filteredTasks.filter(t => t.status === col.name),
  }));

  // Sync open task modal with URL task query parameter
  useEffect(() => {
    if (taskParam && localTasksByStatus) {
      const allTasks = localTasksByStatus.flatMap((lane) => lane.tasks);
      const foundTask = allTasks.find((t) => t.id === taskParam);
      if (foundTask) {
        setSelectedTask(foundTask);
        setIsTaskEditOpen(true);
      }
    } else {
      setIsTaskEditOpen(false);
      setSelectedTask(null);
    }
  }, [taskParam, tasks, sprintFilter]);

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
    blockedReason: string | null,
    ownerIds?: string[],
    assigneeIds?: string[],
    sprintId?: string | null
  ) => {
    await createTask(title, desc, status, priority, isBlocked, blockedReason, ownerIds, assigneeIds, sprintId);
  };

  const openEditTask = (task: TaskSummary) => {
    if (!canWrite) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('task', task.id);
      return next;
    });
  };

  const closeEditTask = () => {
    setIsTaskEditOpen(false);
    setSelectedTask(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('task');
      return next;
    });
  };

  const handleEditTask = async (
    title: string,
    desc: string | undefined,
    status: TaskSummary['status'],
    priority: TaskSummary['priority'],
    isBlocked: boolean,
    blockedReason: string | null,
    ownerIds?: string[],
    assigneeIds?: string[],
    sprintId?: string | null
  ) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, title, desc, status, priority, isBlocked, blockedReason, ownerIds, assigneeIds, sprintId);
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

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-slate-500">Filtrar por Sprint:</span>
              <select
                className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                value={sprintFilter}
                onChange={(e) => setSprintFilter(e.target.value)}
              >
                <option value="active" className="dark:bg-slate-900">Sprint Activo</option>
                <option value="backlog" className="dark:bg-slate-900">Backlog general (Sin Sprint)</option>
                <option value="all" className="dark:bg-slate-900">Ver Todo</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900">
                    {s.name} ({s.status === 'ACTIVE' ? 'Activo' : s.status === 'COMPLETED' ? 'Completado' : 'Planificación'})
                  </option>
                ))}
              </select>
            </div>
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
          {/* VISUALIZATION FILTERS BAR */}
          <div className="mb-6 flex flex-wrap items-center gap-4 bg-slate-50/50 dark:bg-slate-900/35 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider shrink-0 mr-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
              <span>Filtros:</span>
            </div>

            {/* Text Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tareas por título o descripción..."
                className="w-full pl-9 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-655 dark:hover:text-slate-350"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Member Filter Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium shrink-0">Persona:</span>
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Todas las personas</option>
                <option value="mine" className="dark:bg-slate-900">Asignadas a mí (o soy Owner)</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId} className="dark:bg-slate-900">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium shrink-0">Prioridad:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Todas las prioridades</option>
                <option value="LOW" className="dark:bg-slate-900">Baja</option>
                <option value="MEDIUM" className="dark:bg-slate-900">Media</option>
                <option value="HIGH" className="dark:bg-slate-900">Alta</option>
                <option value="URGENT" className="dark:bg-slate-900">Urgente</option>
              </select>
            </div>

            {/* Blocked Filter Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium shrink-0">Bloqueo:</span>
              <select
                value={blockedFilter}
                onChange={(e) => setBlockedFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Cualquiera</option>
                <option value="blocked" className="dark:bg-slate-900">Bloqueadas</option>
                <option value="unblocked" className="dark:bg-slate-900">Sin bloquear</option>
              </select>
            </div>

            {/* Clear filters button */}
            {(searchQuery || priorityFilter !== 'all' || memberFilter !== 'all' || blockedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('all');
                  setMemberFilter('all');
                  setBlockedFilter('all');
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition flex items-center gap-1 pl-2"
              >
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-5 min-w-max">
              {localTasksByStatus.map((column) => {
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
          initialSprintId={currentSprintIdForNewTask}
          onSave={handleCreateTask}
          columns={localTasksByStatus.map((lane) => lane.status)}
        />
      )}

      {/* EDIT/DELETE TASK MODAL */}
      {isTaskEditOpen && selectedTask && (
        <TaskModal
          isOpen={isTaskEditOpen}
          onClose={closeEditTask}
          task={selectedTask}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
          columns={localTasksByStatus.map((lane) => lane.status)}
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
