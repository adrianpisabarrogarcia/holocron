import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useBoardStore } from '../../store/useBoardStore';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectGridItem } from './ProjectGridItem';
import { cn } from '../../lib/cn';
import {
  TrendingUp,
  UserCheck,
  ListTodo,
  AlertTriangle,
  Plus,
  Folder,
  Bell,
} from 'lucide-react';
import { ProjectNotificationModal } from '../projects/ProjectNotificationModal';
import {
  projectStatusLabel,
  statusLabel,
} from '../../lib/constants';

type RouteState = {
  denied?: 'admin';
};

export type OverviewPageProps = {
  blockedTasks: number;
  completedTasks: number;
  currentProject: ProjectSummary | null;
  onProjectChange: (projectId: string) => Promise<void>;
  projectAccessLabel: string | null;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  tasksByStatus: Array<{ status: TaskSummary['status']; tasks: TaskSummary[] }>;
  tasks: TaskSummary[];
  userRole: string;
};

export function OverviewPage({
  blockedTasks,
  completedTasks,
  currentProject,
  onProjectChange,
  projectAccessLabel,
  projects,
  selectedProjectId,
  tasksByStatus,
  tasks,
  userRole,
}: OverviewPageProps) {
  const location = useLocation();
  const locationState = (location.state ?? null) as RouteState | null;

  const totalTasks = currentProject?.taskCount ?? 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority count
  const highOrUrgent = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length;

  // Project store actions
  const { deleteProject, updateProject, folders } = useBoardStore();

  // Create Project modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Edit Project modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectSummary['status']>('PLANNING');
  const [editStartDate, setEditStartDate] = useState<string | null>(null);
  const [editEndDate, setEditEndDate] = useState<string | null>(null);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  // Notification modal state
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Collapsed folders state
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const renderProjectHierarchy = (parentId: string | null, depth: number) => {
    const childFolders = folders.filter((f) => f.parentFolderId === parentId);
    const childProjects = projects.filter((p) => p.folderId === parentId);

    // Keep track of all rendered project IDs to find orphans later
    const renderedProjectIds: string[] = [];
    const getRenderedIds = (pId: string | null) => {
      folders.filter((f) => f.parentFolderId === pId).forEach((f) => {
        projects.filter((p) => p.folderId === f.id).forEach((p) => renderedProjectIds.push(p.id));
        getRenderedIds(f.id);
      });
    };
    if (parentId === null) {
      projects.filter((p) => p.folderId === null).forEach((p) => renderedProjectIds.push(p.id));
      getRenderedIds(null);
    }

    return (
      <div className="space-y-2">
        {/* Render child folders */}
        {childFolders.map((folder) => {
          const isCollapsed = collapsedFolders[folder.id];
          return (
            <div key={folder.id} className="space-y-2 animate-in fade-in duration-200">
              <div
                style={{ marginLeft: `${depth * 16}px` }}
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/40 cursor-pointer select-none transition"
              >
                <span className="text-slate-400 dark:text-slate-500 font-bold transition duration-200 text-[10px]">
                  {isCollapsed ? '▶' : '▼'}
                </span>
                <Folder className="h-4 w-4 text-indigo-650 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{folder.name}</span>
              </div>
              {!isCollapsed && (
                <div className="space-y-2">
                  {renderProjectHierarchy(folder.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {/* Render child projects */}
        {childProjects.map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          const canManage = proj.membershipRole === 'MANAGER' || userRole === 'ADMIN';
          return (
            <div key={proj.id} style={{ marginLeft: `${depth * 16}px` }} className="animate-in fade-in duration-200">
              <ProjectGridItem
                proj={proj}
                isSelected={isSelected}
                canManage={canManage}
                onSelect={(id) => void onProjectChange(id)}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </div>
          );
        })}

        {/* Render orphans only at root level */}
        {parentId === null && projects.filter((p) => !renderedProjectIds.includes(p.id)).map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          const canManage = proj.membershipRole === 'MANAGER' || userRole === 'ADMIN';
          return (
            <div key={proj.id} style={{ marginLeft: `${depth * 16}px` }} className="animate-in fade-in duration-200">
              <ProjectGridItem
                proj={proj}
                isSelected={isSelected}
                canManage={canManage}
                onSelect={(id) => void onProjectChange(id)}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const openEdit = (proj: ProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent select project trigger
    setEditId(proj.id);
    setEditName(proj.name);
    setEditDesc(proj.description || '');
    setEditStatus(proj.status);
    setEditStartDate(proj.startDate || null);
    setEditEndDate(proj.endDate || null);
    setEditFolderId(proj.folderId || null);
    setIsEditOpen(true);
  };

  const handleEditSave = async (
    id: string,
    name: string,
    description: string | undefined,
    status: ProjectSummary['status'],
    startDate?: string | null,
    endDate?: string | null,
    folderId?: string | null
  ) => {
    await updateProject(id, name, description, status, startDate, endDate, folderId);
  };

  const handleDelete = async (projId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de que quieres eliminar el proyecto "${name}" y todas sus tareas de forma permanente?`)) {
      try {
        await deleteProject(projId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al borrar proyecto');
      }
    }
  };

  return (
    <section className="space-y-6">
      {locationState?.denied === 'admin' ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>El acceso de administración está limitado a administradores de la plataforma. Has sido redirigido.</span>
        </div>
      ) : null}

      {/* METRIC CARDS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado Proyecto</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 capitalize">
              {currentProject ? projectStatusLabel[currentProject.status] : 'S/D'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tu Rol de Acceso</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{projectAccessLabel ?? 'Ninguno'}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-355 flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tareas Totales</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalTasks}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-350 flex items-center justify-center">
            <ListTodo className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alta Prioridad</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{highOrUrgent}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PROJECT LIST */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Mis Proyectos</CardTitle>
              <CardDescription>Selecciona un proyecto para ver sus detalles</CardDescription>
            </div>
            {userRole !== 'MEMBER' && (
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)} className="text-white">
                  <Plus className="h-4 w-4" />
                  <span>Nuevo</span>
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {renderProjectHierarchy(null, 0)}
          </CardContent>
        </Card>

        {/* VISUAL CHARTS */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Métricas de Avance</CardTitle>
            <CardDescription>Progreso general del proyecto activo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
            
            {/* Circular Progress Gauge */}
            <div className="flex flex-col items-center py-2">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-200 dark:text-slate-800"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-indigo-650 dark:text-indigo-400 transition-all duration-500 ease-in-out"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - progressPercent / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{progressPercent}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Completado</span>
                </div>
              </div>
            </div>

            {/* Status Bars */}
            <div className="space-y-3 pt-2">
              {tasksByStatus.map((col) => {
                const count = col.tasks.length;
                const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                return (
                  <div key={col.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-350">{statusLabel[col.status]}</span>
                      <span className="text-slate-400">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          col.status === 'TODO' && 'bg-indigo-500 dark:bg-indigo-400',
                          col.status === 'IN_PROGRESS' && 'bg-amber-500 dark:bg-amber-400',
                          col.status === 'BLOCKED' && 'bg-rose-500 dark:bg-rose-400',
                          col.status === 'DONE' && 'bg-emerald-500 dark:bg-emerald-400'
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* FOCUS DESCRIPTION */}
      {currentProject && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
            <div>
              <CardDescription>Descripción del proyecto</CardDescription>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{currentProject.name}</CardTitle>
                <button onClick={() => setIsNotifOpen(true)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Notificaciones del proyecto">
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
            {(currentProject.startDate || currentProject.endDate) && (
              <div className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1.5">
                <span>🗓️ Duración:</span>
                <span>
                  {currentProject.startDate ? new Date(currentProject.startDate).toLocaleDateString() : 'Sin definir'} 
                  {' — '} 
                  {currentProject.endDate ? new Date(currentProject.endDate).toLocaleDateString() : 'Sin definir'}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed">
              {currentProject.description ?? 'No hay una descripción configurada para este proyecto. Puedes editar el proyecto para añadir una.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* CREATE DIALOG MODAL */}
      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* EDIT DIALOG MODAL */}
      {isEditOpen && (
        <EditProjectModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          editId={editId}
          initialName={editName}
          initialDesc={editDesc}
          initialStatus={editStatus}
          initialStartDate={editStartDate}
          initialEndDate={editEndDate}
          initialFolderId={editFolderId}
          onSave={handleEditSave}
        />
      )}

      {currentProject && (
        <ProjectNotificationModal
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          projectId={currentProject.id}
          projectName={currentProject.name}
        />
      )}
    </section>
  );
}
