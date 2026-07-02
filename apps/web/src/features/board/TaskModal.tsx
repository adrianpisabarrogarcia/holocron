import { FormEvent, useState } from 'react';
import type { TaskSummary } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ListTodo, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { fieldClassName } from '../../lib/constants';
import { RichTextEditor } from './RichTextEditor';

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task: TaskSummary | null; // Null means create mode
  initialStatus?: TaskSummary['status'];
  onSave: (
    title: string,
    desc: string | undefined,
    status: TaskSummary['status'],
    priority: TaskSummary['priority'],
    isBlocked: boolean,
    blockedReason: string | null
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
  columns: string[];
};

export function TaskModal({
  isOpen,
  onClose,
  task,
  initialStatus = 'TODO',
  onSave,
  onDelete,
  columns,
}: TaskModalProps) {
  const [taskTitle, setTaskTitle] = useState(task?.title ?? '');
  const [taskDesc, setTaskDesc] = useState(task?.description ?? '');
  const [taskPriority, setTaskPriority] = useState<TaskSummary['priority']>(task?.priority ?? 'MEDIUM');
  const [taskStatus, setTaskStatus] = useState<TaskSummary['status']>(task?.status ?? initialStatus);
  const [isBlocked, setIsBlocked] = useState(task?.isBlocked ?? false);
  const [blockedReason, setBlockedReason] = useState(task?.blockedReason ?? '');

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setError(null);
    setPending(true);
    try {
      await onSave(
        taskTitle,
        taskDesc || undefined,
        taskStatus,
        taskPriority,
        isBlocked,
        isBlocked ? (blockedReason.trim() || 'Bloqueado') : null
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la tarea');
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setError(null);
    setPending(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al borrar la tarea');
      setPending(false);
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
          <ListTodo className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">{task ? 'Modificar Tarea' : 'Nueva Tarea'}</CardTitle>
            <CardDescription>{task ? 'Detalles y parámetros de la tarea' : 'Añadir tarea al tablero'}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Título</span>
              <input
                className={fieldClassName}
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ej: Maquetar dashboard"
                required
              />
            </label>
            <div className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Descripción</span>
              <RichTextEditor
                value={taskDesc}
                onChange={(html) => setTaskDesc(html)}
                placeholder="Describe los pasos, requerimientos, o adjunta imágenes y archivos..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm text-slate-650 dark:text-slate-355">
                <span className="mb-1 block font-medium">Prioridad</span>
                <select
                  className={fieldClassName}
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskSummary['priority'])}
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </label>
              <label className="block text-sm text-slate-650 dark:text-slate-355">
                <span className="mb-1 block font-medium">Estado</span>
                <select
                  className={fieldClassName}
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                >
                  {columns.map((colName) => (
                    <option key={colName} value={colName}>
                      {colName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Blocked checkbox and reason */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-600 h-4.5 w-4.5 transition duration-150"
                />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-250">
                  Esta tarea está bloqueada
                </span>
              </label>

              {isBlocked && (
                <label className="block text-sm text-slate-655 dark:text-slate-355">
                  <span className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-500">Motivo del bloqueo</span>
                  <input
                    type="text"
                    className={`${fieldClassName} text-xs py-1.5`}
                    value={blockedReason}
                    onChange={(e) => setBlockedReason(e.target.value)}
                    placeholder="Ej: Esperando respuesta del cliente"
                    required
                  />
                </label>
              )}
            </div>

            {error && <div className="text-xs text-rose-500">{error}</div>}
            <div className="flex gap-2 justify-between pt-2">
              {task && onDelete ? (
                <Button type="button" variant="danger" className="text-white" onClick={handleDelete} disabled={pending}>
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar</span>
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="text-white" disabled={pending}>
                  {pending ? 'Guardando...' : task ? 'Guardar' : 'Crear Tarea'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
