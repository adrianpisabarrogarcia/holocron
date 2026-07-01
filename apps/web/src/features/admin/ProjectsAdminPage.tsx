import { useState } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EditProjectModal } from '../overview/EditProjectModal';
import { CreateProjectModal } from '../overview/CreateProjectModal';
import { cn } from '../../lib/cn';
import { projectStatusLabel, projectStatusTone } from '../../lib/constants';
import { Folder, Plus, Edit3, Trash2, FolderPlus, Check, X } from 'lucide-react';
import type { ProjectSummary } from '@holocron/contracts';
import { fieldClassName } from '../../lib/constants';

export function ProjectsAdminPage() {
  const { projects, folders, deleteProject, updateProject, createFolder, deleteFolder } = useBoardStore();

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

  // Folder administration state
  const [newFolderName, setNewFolderName] = useState('');
  const [activeSubfolderParentId, setActiveSubfolderParentId] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState('');

  const openEdit = (proj: ProjectSummary) => {
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

  const handleDelete = async (projId: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el proyecto "${name}" y todas sus tareas de forma permanente?`)) {
      try {
        await deleteProject(projId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al borrar proyecto');
      }
    }
  };

  // Folder Management handlers
  const handleCreateRootFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName, null);
      setNewFolderName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear carpeta');
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subfolderName.trim() || !activeSubfolderParentId) return;
    try {
      await createFolder(subfolderName, activeSubfolderParentId);
      setSubfolderName('');
      setActiveSubfolderParentId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear subcarpeta');
    }
  };

  const handleDeleteFolder = async (folderId: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la carpeta "${name}"? Las subcarpetas se eliminarán y los proyectos volverán a la raíz.`)) {
      try {
        await deleteFolder(folderId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar carpeta');
      }
    }
  };

  const getFlattenedFolders = () => {
    const list: Array<{ id: string; name: string; parentFolderId: string | null; depth: number }> = [];
    const recurse = (parentId: string | null, depth: number) => {
      folders
        .filter((f) => f.parentFolderId === parentId)
        .forEach((f) => {
          list.push({ id: f.id, name: f.name, parentFolderId: f.parentFolderId, depth });
          recurse(f.id, depth + 1);
        });
    };
    recurse(null, 0);
    return list;
  };

  const flatFolders = getFlattenedFolders();

  // Find full path of folder for project display
  const getFolderPathName = (folderId: string | null): string => {
    if (!folderId) return '';
    const path: string[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
      const folder = folders.find((f) => f.id === currentId);
      if (folder) {
        path.unshift(folder.name);
        currentId = folder.parentFolderId;
      } else {
        break;
      }
    }
    return path.join(' / ');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start animate-in fade-in duration-300">
      {/* PROJECTS LIST PANEL */}
      <div className="xl:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Proyectos del Workspace</h2>
          <Button size="sm" variant="primary" className="text-white" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Crear Proyecto</span>
          </Button>
        </div>

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
                    const folderPath = getFolderPathName(proj.folderId ?? null);

                    return (
                      <tr key={proj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition duration-150">
                        {/* Name & ID */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                              <Folder className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-snug">{proj.name}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-400">{proj.id}</span>
                                {folderPath && (
                                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                                    📁 {folderPath}
                                  </span>
                                )}
                                {(proj.startDate || proj.endDate) && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
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
      </div>

      {/* FOLDER MANAGEMENT PANEL */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Estructura de Carpetas</h2>
        
        <Card>
          <CardHeader className="pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-2">
              <Folder className="h-4.5 w-4.5 text-indigo-650" />
              <span>Carpetas Organizadoras</span>
            </CardTitle>
            <CardDescription className="text-xs">Crea y anida carpetas para agrupar tus proyectos</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Create root folder form */}
            <form onSubmit={handleCreateRootFolder} className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva carpeta raíz..."
                className={cn(fieldClassName, 'text-xs py-1.5')}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <Button type="submit" size="sm" variant="primary" className="text-white shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>

            {/* Flat list of folders rendering with indentation */}
            <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
              {flatFolders.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No hay carpetas creadas.
                </div>
              ) : (
                flatFolders.map((folder) => {
                  const isCreatingSub = activeSubfolderParentId === folder.id;

                  return (
                    <div key={folder.id} className="space-y-1">
                      <div
                        style={{ paddingLeft: `${folder.depth * 16 + 8}px` }}
                        className="py-2 pr-2 rounded-xl text-xs font-semibold transition flex items-center justify-between group bg-slate-50/40 hover:bg-slate-100/50 dark:bg-slate-900/10 dark:hover:bg-slate-800/20 border border-slate-200/30 dark:border-slate-800/30"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Folder className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                          <span className="truncate text-slate-800 dark:text-slate-200">{folder.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setActiveSubfolderParentId(isCreatingSub ? null : folder.id);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition"
                            title="Añadir subcarpeta"
                          >
                            <FolderPlus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder.id, folder.name)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-rose-500 transition"
                            title="Eliminar carpeta"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline subfolder input */}
                      {isCreatingSub && (
                        <form
                          onSubmit={handleCreateSubfolder}
                          style={{ marginLeft: `${(folder.depth + 1) * 16 + 8}px` }}
                          className="flex gap-1.5 py-1 pr-2 animate-in slide-in-from-top-1 duration-150"
                        >
                          <input
                            type="text"
                            placeholder="Subcarpeta..."
                            className={cn(fieldClassName, 'text-[11px] py-1 px-2')}
                            value={subfolderName}
                            onChange={(e) => setSubfolderName(e.target.value)}
                            autoFocus
                          />
                          <button type="submit" className="p-1 bg-indigo-655 text-white rounded hover:bg-indigo-750 transition">
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSubfolderParentId(null)}
                            className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded hover:text-slate-600 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
          initialFolderId={editFolderId}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
