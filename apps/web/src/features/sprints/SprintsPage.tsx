import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProjectSummary, TaskSummary, SprintSummary } from '@holocron/contracts';
import { useBoardStore } from '../../store/useBoardStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { fieldClassName } from '../../lib/constants';
import { cn } from '../../lib/cn';
import { TaskModal } from '../board/TaskModal';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  Folder, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight,
  ArrowUp,
  ArrowDown,
  User,
  AlertTriangle,
  Clock
} from 'lucide-react';

type SprintsPageProps = {
  currentProject: ProjectSummary | null;
  onProjectChange: (id: string) => Promise<void>;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  userRole: string;
};

export function SprintsPage({
  currentProject,
  onProjectChange,
  projects,
  selectedProjectId,
  userRole,
}: SprintsPageProps) {
  const { 
    tasks, 
    sprints, 
    members,
    createSprint, 
    updateSprint, 
    deleteSprint, 
    createTask,
    updateTask,
    deleteTask,
    loadBoard 
  } = useBoardStore();

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Search parameters linking for Task Detail Modal
  const taskQueryId = searchParams.get('task');
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);
  const [createInitialSprintId, setCreateInitialSprintId] = useState<string | null>(null);

  // Sprint form states
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintSummary | null>(null);

  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sprintError, setSprintError] = useState<string | null>(null);

  // Active state for drag & drop
  const [activeSprintDragId, setActiveSprintDragId] = useState<string | null | 'backlog'>(null);
  const [collapsedSprints, setCollapsedSprints] = useState<Record<string, boolean>>({});

  const canWrite = userRole === 'ADMIN' || currentProject?.membershipRole === 'MANAGER' || currentProject?.membershipRole === 'CONTRIBUTOR';

  // Load selected task details from URL if any
  useEffect(() => {
    if (taskQueryId && tasks.length > 0) {
      const found = tasks.find((t) => t.id === taskQueryId);
      if (found) {
        setSelectedTask(found);
        setIsTaskEditOpen(true);
      }
    }
  }, [taskQueryId, tasks]);

  const openEditTask = (task: TaskSummary) => {
    setSelectedTask(task);
    setIsTaskEditOpen(true);
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
      closeEditTask();
    }
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

  // Group tasks by Sprint
  const backlogTasks = tasks.filter((t) => !t.sprintId);
  const tasksBySprint = (sprintId: string) => tasks.filter((t) => t.sprintId === sprintId);

  // Sprint Handlers
  const handleOpenCreateSprint = () => {
    setSprintName(`Sprint ${sprints.length + 1}`);
    setStartDate('');
    setEndDate('');
    setSprintError(null);
    setIsCreateSprintOpen(true);
  };

  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim()) return;
    try {
      await createSprint(sprintName, startDate || null, endDate || null);
      setIsCreateSprintOpen(false);
    } catch (err) {
      setSprintError(err instanceof Error ? err.message : 'Error creando Sprint');
    }
  };

  const handleOpenEditSprint = (sprint: SprintSummary) => {
    setEditingSprint(sprint);
    setSprintName(sprint.name);
    setStartDate(sprint.startDate ? sprint.startDate.split('T')[0] : '');
    setEndDate(sprint.endDate ? sprint.endDate.split('T')[0] : '');
    setSprintError(null);
    setIsEditSprintOpen(true);
  };

  const handleEditSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSprint || !sprintName.trim()) return;
    try {
      await updateSprint(editingSprint.id, sprintName, startDate || null, endDate || null, editingSprint.status);
      setIsEditSprintOpen(false);
    } catch (err) {
      setSprintError(err instanceof Error ? err.message : 'Error guardando Sprint');
    }
  };

  const handleDeleteSprintClick = async (sprint: SprintSummary) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el sprint "${sprint.name}"? Las tareas asociadas volverán al backlog.`)) {
      try {
        await deleteSprint(sprint.id);
      } catch (err) {
        alert('Error eliminando sprint');
      }
    }
  };

  const handleStartSprint = async (sprint: SprintSummary) => {
    const activeExists = sprints.some(s => s.status === 'ACTIVE');
    if (activeExists) {
      alert('Ya existe un Sprint activo en este proyecto. Debes completarlo antes de iniciar otro.');
      return;
    }
    if (confirm(`¿Deseas iniciar el sprint "${sprint.name}"?`)) {
      await updateSprint(sprint.id, undefined, undefined, undefined, 'ACTIVE');
    }
  };

  const handleCompleteSprint = async (sprint: SprintSummary) => {
    const sprintTasks = tasksBySprint(sprint.id);
    const unfinished = sprintTasks.filter(t => t.status !== 'DONE');

    if (unfinished.length > 0) {
      if (confirm(`El sprint tiene ${unfinished.length} tareas sin finalizar. ¿Deseas completarlo y mover las tareas incompletas de vuelta al Backlog?`)) {
        // First move unfinished tasks to Backlog
        await Promise.all(
          unfinished.map((t) => 
            updateTask(t.id, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, null)
          )
        );
        // Complete Sprint
        await updateSprint(sprint.id, undefined, undefined, undefined, 'COMPLETED');
      }
    } else {
      if (confirm(`¿Deseas marcar el sprint "${sprint.name}" como completado?`)) {
        await updateSprint(sprint.id, undefined, undefined, undefined, 'COMPLETED');
      }
    }
  };

  const handleMoveSprint = async (sprintId: string, direction: 'up' | 'down') => {
    const currentIndex = sprints.findIndex((s) => s.id === sprintId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sprints.length) return;

    const currentSprint = sprints[currentIndex];
    const targetSprint = sprints[targetIndex];

    // Swap positions
    const currentPos = currentSprint.position;
    const targetPos = targetSprint.position;

    // Call updateSprint for both
    await Promise.all([
      updateSprint(currentSprint.id, undefined, undefined, undefined, undefined, targetPos),
      updateSprint(targetSprint.id, undefined, undefined, undefined, undefined, currentPos),
    ]);
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string | null | 'backlog') => {
    e.preventDefault();
    setActiveSprintDragId(targetId);
  };

  const handleDragLeave = () => {
    setActiveSprintDragId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSprintId: string | null) => {
    e.preventDefault();
    setActiveSprintDragId(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await updateTask(taskId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, targetSprintId);
    }
  };

  const toggleCollapse = (sprintId: string) => {
    setCollapsedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  const getPriorityBadgeClass = (prio: string) => {
    switch (prio) {
      case 'LOW': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      case 'MEDIUM': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-350';
      case 'HIGH': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-350';
      case 'URGENT': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-350';
      default: return '';
    }
  };

  if (!currentProject) {
    return (
      <div className="flex h-72 items-center justify-center">
        <p className="text-slate-500">Selecciona o crea un proyecto para planificar sprints.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Upper Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Sprint Planning</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestiona ciclos de trabajo, arrastra tareas entre sprints o planifícalas directamente desde el backlog.
          </p>
        </div>
        
        <Button onClick={handleOpenCreateSprint} className="text-white flex items-center gap-2" variant="primary">
          <Plus className="h-4 w-4" />
          <span>Crear Sprint</span>
        </Button>
      </div>

      {/* Main Layout Grid: Left Sprints (2/3) - Right Backlog (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Sprints List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sprints Activos & Planificados</h3>
          
          {sprints.length === 0 ? (
            <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-transparent text-center py-12">
              <Calendar className="h-12 w-12 text-slate-350 dark:text-slate-650 mx-auto mb-3" />
              <CardTitle className="text-base text-slate-650 dark:text-slate-355">No hay sprints creados</CardTitle>
              <CardDescription className="max-w-xs mx-auto mt-2 text-xs">
                Empieza creando un sprint para agrupar tareas y activar ciclos de trabajo controlados.
              </CardDescription>
            </Card>
          ) : (
            sprints.map((sprint, index) => {
              const sprintTasks = tasksBySprint(sprint.id);
              const isCollapsed = collapsedSprints[sprint.id] || false;
              const isDragActive = activeSprintDragId === sprint.id;

              const finishedTasks = sprintTasks.filter(t => t.status === 'DONE');
              const progressPercentage = sprintTasks.length > 0 ? Math.round((finishedTasks.length / sprintTasks.length) * 100) : 0;

              return (
                <Card 
                  key={sprint.id} 
                  className={cn(
                    "transition duration-200 border-slate-200 dark:border-slate-800/80 overflow-hidden",
                    isDragActive && "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10",
                    sprint.status === 'ACTIVE' && "border-indigo-500/40 shadow-md shadow-indigo-500/5 bg-indigo-500/[0.01]"
                  )}
                  onDragOver={(e) => handleDragOver(e, sprint.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sprint.id)}
                >
                  <CardHeader className="p-4 flex flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleCollapse(sprint.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 transition"
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{sprint.name}</span>
                          
                          {/* Sprint Status Badge */}
                          {sprint.status === 'ACTIVE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white animate-pulse">
                              Activo
                            </span>
                          )}
                          {sprint.status === 'PLANNING' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Planificación
                            </span>
                          )}
                          {sprint.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                              Completado
                            </span>
                          )}
                        </div>

                        {/* Dates / Duration */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="h-3 w-3" />
                          <span>
                            {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'Sin fecha'} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'Sin fecha'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span>{sprintTasks.length} {sprintTasks.length === 1 ? 'tarea' : 'tareas'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Sprint action controls */}
                      {sprint.status === 'PLANNING' && (
                        <Button 
                          onClick={() => handleStartSprint(sprint)}
                          size="sm" 
                          variant="outline" 
                          className="border-indigo-500/30 text-indigo-600 hover:bg-indigo-500 hover:text-white dark:text-indigo-400 dark:hover:bg-indigo-500/20 text-xs px-2.5 h-7.5"
                        >
                          <Play className="h-3 w-3 mr-1" /> Iniciar
                        </Button>
                      )}
                      {sprint.status === 'ACTIVE' && (
                        <Button 
                          onClick={() => handleCompleteSprint(sprint)}
                          size="sm" 
                          variant="outline" 
                          className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-500/20 text-xs px-2.5 h-7.5"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Completar
                        </Button>
                      )}

                       <Button 
                        onClick={() => handleMoveSprint(sprint.id, 'up')}
                        disabled={index === 0}
                        size="sm" 
                        variant="ghost" 
                        className="h-7.5 w-7.5 p-0 text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 disabled:opacity-30 flex items-center justify-center"
                        title="Mover Arriba"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>

                      <Button 
                        onClick={() => handleMoveSprint(sprint.id, 'down')}
                        disabled={index === sprints.length - 1}
                        size="sm" 
                        variant="ghost" 
                        className="h-7.5 w-7.5 p-0 text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 disabled:opacity-30 flex items-center justify-center"
                        title="Mover Abajo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>

                       <Button 
                        onClick={() => handleOpenEditSprint(sprint)}
                        size="sm" 
                        variant="ghost" 
                        className="h-7.5 w-7.5 p-0 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 flex items-center justify-center"
                        title="Editar Sprint"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>

                      <Button 
                        onClick={() => handleDeleteSprintClick(sprint)}
                        size="sm" 
                        variant="ghost" 
                        className="h-7.5 w-7.5 p-0 text-slate-400 hover:text-rose-500 flex items-center justify-center"
                        title="Eliminar Sprint"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {!isCollapsed && (
                    <CardContent className="p-2 space-y-1.5 bg-slate-50/30 dark:bg-slate-900/10 min-h-[50px]">
                      {sprint.status === 'ACTIVE' && sprintTasks.length > 0 && (
                        <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Progreso de Sprint: {progressPercentage}%</span>
                          <div className="w-32 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden ml-2 flex-1">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                          </div>
                        </div>
                      )}

                      {sprintTasks.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Arrastra tareas aquí o edítalas para incluirlas en este Sprint.
                        </div>
                      ) : (
                        sprintTasks.map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => openEditTask(task)}
                            className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 cursor-pointer shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 uppercase tracking-wide",
                                getPriorityBadgeClass(task.priority)
                              )}>
                                {task.priority}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Task owners stacked */}
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {task.owners?.slice(0, 3).map((o) => {
                                  const init = o.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                                  return (
                                    <div key={o.id} className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-white dark:border-slate-900 text-[9px] font-bold flex items-center justify-center">
                                      {init}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40">
                                {task.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: General Backlog (Without Sprint) */}
        <div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Backlog General</h3>
              <Button 
                onClick={() => {
                  setCreateInitialSprintId(null);
                  setIsTaskCreateOpen(true);
                }} 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 text-indigo-600 dark:text-indigo-400 px-2"
              >
                <Plus className="h-3 w-3 mr-1" /> Tarea
              </Button>
            </div>

            <div 
              className={cn(
                "border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/20 min-h-[450px] transition duration-200",
                activeSprintDragId === 'backlog' && "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10"
              )}
              onDragOver={(e) => handleDragOver(e, 'backlog')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
            >
              {backlogTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-xs text-slate-400">
                  <Folder className="h-8 w-8 text-slate-350 dark:text-slate-650 mb-2" />
                  <span>El Backlog está vacío</span>
                  <span className="text-[10px] mt-1 text-slate-500">Arrastra tareas aquí para quitarlas de un sprint o crea una nueva.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {backlogTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => openEditTask(task)}
                      className="group flex flex-col gap-2 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-extrabold shrink-0 uppercase tracking-wide",
                          getPriorityBadgeClass(task.priority)
                        )}>
                          {task.priority}
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1 overflow-hidden">
                            {task.owners?.slice(0, 3).map((o) => {
                              const init = o.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                              return (
                                <div key={o.id} className="h-4.5 w-4.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-white dark:border-slate-900 text-[8px] font-bold flex items-center justify-center" title={`Owner: ${o.name}`}>
                                  {init}
                                </div>
                              );
                            })}
                          </div>
                          
                          <span className="px-1 py-0.2 rounded-full font-bold bg-slate-50 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40">
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE SPRINT DIALOG MODAL */}
      {isCreateSprintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 outline-none">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Crear Nuevo Sprint</span>
            </h3>

            <form onSubmit={handleCreateSprintSubmit} className="space-y-4">
              <label className="block text-sm text-slate-650 dark:text-slate-355">
                <span className="mb-1 block font-medium">Nombre de Sprint *</span>
                <input 
                  type="text" 
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className={fieldClassName}
                  placeholder="ej. Sprint 1"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm text-slate-650 dark:text-slate-355">
                  <span className="mb-1 block font-medium">Fecha de Inicio</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label className="block text-sm text-slate-650 dark:text-slate-355">
                  <span className="mb-1 block font-medium">Fecha de Cierre</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={fieldClassName}
                  />
                </label>
              </div>

              {sprintError && (
                <div className="text-xs text-rose-500 font-medium">
                  {sprintError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateSprintOpen(false)}>
                  Cancelar
                </Button>
                <Button className="text-white" variant="primary" type="submit">
                  Crear Sprint
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SPRINT DIALOG MODAL */}
      {isEditSprintOpen && editingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 outline-none">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Editar Sprint: {editingSprint.name}</span>
            </h3>

            <form onSubmit={handleEditSprintSubmit} className="space-y-4">
              <label className="block text-sm text-slate-650 dark:text-slate-355">
                <span className="mb-1 block font-medium">Nombre de Sprint *</span>
                <input 
                  type="text" 
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className={fieldClassName}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm text-slate-650 dark:text-slate-355">
                  <span className="mb-1 block font-medium">Fecha de Inicio</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label className="block text-sm text-slate-650 dark:text-slate-355">
                  <span className="mb-1 block font-medium">Fecha de Cierre</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={fieldClassName}
                  />
                </label>
              </div>

              {sprintError && (
                <div className="text-xs text-rose-500 font-medium">
                  {sprintError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditSprintOpen(false)}>
                  Cancelar
                </Button>
                <Button className="text-white" variant="primary" type="submit">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isTaskCreateOpen && (
        <TaskModal
          isOpen={isTaskCreateOpen}
          onClose={() => setIsTaskCreateOpen(false)}
          task={null}
          initialStatus="TODO"
          onSave={handleCreateTask}
          columns={['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']}
        />
      )}

      {/* EDIT/DETAIL TASK MODAL */}
      {isTaskEditOpen && selectedTask && (
        <TaskModal
          isOpen={isTaskEditOpen}
          onClose={closeEditTask}
          task={selectedTask}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
          columns={['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']}
        />
      )}
    </div>
  );
}
