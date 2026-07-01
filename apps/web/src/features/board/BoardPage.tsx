import { useState } from 'react';
import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useBoardStore } from '../../store/useBoardStore';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';
import { Folder, FolderPlus, Plus, Trash2, ChevronRight, Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { fieldClassName } from '../../lib/constants';

type BoardPageProps = {
  currentProject: ProjectSummary | null;
  onProjectChange: (projectId: string) => Promise<void>;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  tasksByStatus: Array<{ status: TaskSummary['status']; tasks: TaskSummary[] }>;
  userRole: string;
};

export function BoardPage({ currentProject, tasksByStatus, userRole }: BoardPageProps) {
  // Store task & folder actions
  const { createTask, updateTask, deleteTask, moveTask, folders, createFolder, deleteFolder } = useBoardStore();

  // Task creation/editing state
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskSummary['status']>('TODO');

  // Selected folder state to filter tasks
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeSubfolderParentId, setActiveSubfolderParentId] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState('');

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
    folderId?: string | null
  ) => {
    await createTask(title, desc, status, priority, folderId);
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
    folderId?: string | null
  ) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, title, desc, status, priority, folderId);
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

  const handleCreateRootFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim(), null);
      setNewFolderName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear carpeta');
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subfolderName.trim() || !activeSubfolderParentId) return;
    try {
      await createFolder(subfolderName.trim(), activeSubfolderParentId);
      setSubfolderName('');
      setActiveSubfolderParentId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear subcarpeta');
    }
  };

  const handleDeleteFolder = async (folderId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de que quieres eliminar la carpeta "${name}"? Las tareas de esta carpeta se moverán a la raíz.`)) {
      try {
        await deleteFolder(folderId);
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al borrar carpeta');
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

  // Helper to collect all recursive folder IDs descendant from parent
  const getDescendantFolderIds = (folderId: string): string[] => {
    const ids = [folderId];
    const recurse = (id: string) => {
      folders.filter(f => f.parentFolderId === id).forEach(f => {
        ids.push(f.id);
        recurse(f.id);
      });
    };
    recurse(folderId);
    return ids;
  };

  // Filter tasks based on active folder selection (including descendants)
  const activeFolderIds = selectedFolderId ? getDescendantFolderIds(selectedFolderId) : null;
  const filteredTasksByStatus = tasksByStatus.map((col) => ({
    ...col,
    tasks: col.tasks.filter((t) => !activeFolderIds || (t.folderId && activeFolderIds.includes(t.folderId))),
  }));

  const flatFolders = getFlattenedFolders();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* FOLDER EXPLORER PANEL */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-2">
              <Folder className="h-4.5 w-4.5 text-indigo-650" />
              <span>Carpetas del Proyecto</span>
            </CardTitle>
            <CardDescription className="text-xs">Organiza tus tareas en subcarpetas jerárquicas</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Folder creation form */}
            {canWrite && (
              <form onSubmit={handleCreateRootFolder} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva carpeta..."
                  className={cn(fieldClassName, 'text-xs py-1.5')}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <Button type="submit" size="sm" variant="primary" className="text-white shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}

            {/* Folder List tree */}
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-transparent',
                  selectedFolderId === null
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-750 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800/40'
                )}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span>Todas las tareas</span>
              </button>

              {flatFolders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                const isCreatingSub = activeSubfolderParentId === folder.id;
                
                return (
                  <div key={folder.id} className="space-y-1">
                    <div
                      onClick={() => setSelectedFolderId(folder.id)}
                      style={{ paddingLeft: `${folder.depth * 12 + 12}px` }}
                      className={cn(
                        'w-full text-left py-1.5 pr-2 rounded-xl text-xs font-medium transition flex items-center justify-between group border border-transparent cursor-pointer',
                        isSelected
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-750 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800/40'
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-indigo-650 transition" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      
                      {/* Action buttons on hover */}
                      {canWrite && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSubfolderParentId(isCreatingSub ? null : folder.id);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                            title="Añadir subcarpeta"
                          >
                            <FolderPlus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-rose-500"
                            title="Eliminar carpeta"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline subfolder creation */}
                    {isCreatingSub && (
                      <form
                        onSubmit={handleCreateSubfolder}
                        style={{ marginLeft: `${(folder.depth + 1) * 12 + 12}px` }}
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
                        <button type="submit" className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-750 transition">
                          <Check className="h-3 w-3" />
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOARD VIEW */}
      <div className="lg:col-span-3 space-y-6">
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
              {filteredTasksByStatus.map((column) => {
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
      </div>

      {/* CREATE TASK MODAL */}
      {isTaskCreateOpen && (
        <TaskModal
          isOpen={isTaskCreateOpen}
          onClose={() => setIsTaskCreateOpen(false)}
          task={null}
          initialStatus={createInitialStatus}
          initialFolderId={selectedFolderId}
          folders={folders}
          onSave={handleCreateTask}
        />
      )}

      {/* EDIT/DELETE TASK MODAL */}
      {isTaskEditOpen && selectedTask && (
        <TaskModal
          isOpen={isTaskEditOpen}
          onClose={() => setIsTaskEditOpen(false)}
          task={selectedTask}
          folders={folders}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
