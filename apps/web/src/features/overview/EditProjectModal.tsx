import { FormEvent, useState } from 'react';
import type { ProjectSummary } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Folder, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { fieldClassName } from '../../lib/constants';

type EditProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editId: string;
  initialName: string;
  initialDesc: string;
  initialStatus: ProjectSummary['status'];
  onSave: (id: string, name: string, description: string | undefined, status: ProjectSummary['status']) => Promise<void>;
};

export function EditProjectModal({
  isOpen,
  onClose,
  editId,
  initialName,
  initialDesc,
  initialStatus,
  onSave,
}: EditProjectModalProps) {
  const [editName, setEditName] = useState(initialName);
  const [editDesc, setEditDesc] = useState(initialDesc);
  const [editStatus, setEditStatus] = useState<ProjectSummary['status']>(initialStatus);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  if (!isOpen) return null;

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditError(null);
    setEditPending(true);
    try {
      await onSave(editId, editName, editDesc || undefined, editStatus);
      onClose();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setEditPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
        
        <CardHeader className="p-0 mb-4 flex flex-row items-center gap-3">
          <Folder className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">Editar Proyecto</CardTitle>
            <CardDescription>Modifica los detalles del área de trabajo</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Nombre del proyecto</span>
              <input
                className={fieldClassName}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Descripción</span>
              <textarea
                className={cn(fieldClassName, 'resize-none h-24')}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </label>
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Estado del proyecto</span>
              <select
                className={fieldClassName}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ProjectSummary['status'])}
              >
                <option value="PLANNING">Planificación</option>
                <option value="ACTIVE">Activo</option>
                <option value="ON_HOLD">En Pausa</option>
                <option value="COMPLETED">Completado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </label>
            {editError && <div className="text-xs text-rose-500">{editError}</div>}
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="text-white" disabled={editPending}>
                {editPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
