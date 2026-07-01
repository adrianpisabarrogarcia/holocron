import { useState } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EditProjectModal } from '../overview/EditProjectModal';
import { CreateProjectModal } from '../overview/CreateProjectModal';
import { cn } from '../../lib/cn';
import { projectStatusLabel, projectStatusTone } from '../../lib/constants';
import { Folder, Plus, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import type { ProjectSummary } from '@holocron/contracts';

export function ProjectsAdminPage() {
  const { projects, deleteProject, updateProject } = useBoardStore();

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

  const openEdit = (proj: ProjectSummary) => {
    setEditId(proj.id);
    setEditName(proj.name);
    setEditDesc(proj.description || '');
    setEditStatus(proj.status);
    setEditStartDate(proj.startDate || null);
    setEditEndDate(proj.endDate || null);
    setIsEditOpen(true);
  };

  const handleEditSave = async (
    id: string,
    name: string,
    description: string | undefined,
    status: ProjectSummary['status'],
    startDate?: string | null,
    endDate?: string | null
  ) => {
    await updateProject(id, name, description, status, startDate, endDate);
  };

  const handleDelete = async (projId: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el proyecto "${name}" y todas sus tareas de forma permanente?`)) {
      try {
        await deleteProject(projId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al borrar proyecto');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex justify-end items-center">
        <Button size="sm" variant="primary" className="text-white" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Crear Proyecto</span>
        </Button>
      </div>

      {/* PROJECTS TABLE */}
      <Card>
        <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
          <CardTitle>Listado de Proyectos</CardTitle>
          <CardDescription>Administra y gestiona todos los proyectos y áreas de trabajo del sistema</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600 dark:text-slate-355">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:border-slate-800/80">
                <tr>
                  <th className="px-6 py-4">Proyecto</th>
                  <th className="px-6 py-4">Descripción Inicial</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Progreso de Tareas</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 bg-white/30 dark:bg-slate-900/10">
                {projects.map((proj) => {
                  const total = proj.taskCount ?? 0;
                  const completed = proj.completedTaskCount ?? 0;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition duration-150">
                      {/* Name & ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                            <Folder className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{proj.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">{proj.id}</span>
                              {(proj.startDate || proj.endDate) && (
                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                                  {proj.startDate ? new Date(proj.startDate).toLocaleDateString() : '?'} — {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : '?'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 max-w-xs truncate text-slate-500 dark:text-slate-405">
                        {proj.description || <span className="italic text-slate-400">Sin descripción</span>}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide border',
                          projectStatusTone[proj.status]
                        )}>
                          {projectStatusLabel[proj.status]}
                        </span>
                      </td>

                      {/* Progress Stats */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center justify-center gap-1.5 max-w-[140px] mx-auto">
                          <div className="flex items-center justify-between w-full text-xs font-bold text-slate-500">
                            <span>{completed}/{total}</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/30 dark:border-slate-700/30">
                            <div
                              className="h-full rounded-full bg-indigo-650 dark:bg-indigo-400 transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(proj)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150"
                            title="Editar Proyecto"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(proj.id, proj.name)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150"
                            title="Eliminar Proyecto"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {projects.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400 dark:text-slate-500" colSpan={5}>
                      No hay proyectos en el sistema.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* EDIT MODAL */}
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
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
