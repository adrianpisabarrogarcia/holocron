import { FormEvent, useState, useMemo } from 'react';
import { useEscapeKey } from '../../lib/useEscapeKey';
import type { TaskSummary } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ListTodo, Trash2, X, Link, Check } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';
import { RichTextEditor } from './RichTextEditor';
import { AttachmentsSection, type Attachment } from './AttachmentsSection';

import { useBoardStore } from '../../store/useBoardStore';

// --- Attachment serialization helpers ---
const ATT_MARKER = 'data-holocron-attachments';

function serializeAttachments(atts: Attachment[]): string {
  if (atts.length === 0) return '';
  const json = JSON.stringify(atts);
  return `<div ${ATT_MARKER}="${encodeURIComponent(json)}" style="display:none"></div>`;
}

function parseAttachments(html: string): { cleanHtml: string; attachments: Attachment[] } {
  const markerStart = `<div ${ATT_MARKER}="`;
  const idx = html.indexOf(markerStart);
  if (idx === -1) return { cleanHtml: html, attachments: [] };
  try {
    const valueStart = idx + markerStart.length;
    const valueEnd = html.indexOf('"', valueStart);
    const encoded = html.substring(valueStart, valueEnd);
    const attachments: Attachment[] = JSON.parse(decodeURIComponent(encoded));
    const cleanHtml = html.substring(0, idx).trim();
    return { cleanHtml, attachments };
  } catch {
    return { cleanHtml: html, attachments: [] };
  }
}

// ----------------------------------------

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
    blockedReason: string | null,
    ownerIds?: string[],
    assigneeIds?: string[]
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
  const { cleanHtml: initialHtml, attachments: initialAtts } = useMemo(
    () => parseAttachments(task?.description ?? ''),
    [task?.description]
  );

  const { members } = useBoardStore();

  const [taskTitle, setTaskTitle] = useState(task?.title ?? '');
  const [taskDesc, setTaskDesc] = useState(initialHtml);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAtts);
  const [taskPriority, setTaskPriority] = useState<TaskSummary['priority']>(task?.priority ?? 'MEDIUM');
  const [taskStatus, setTaskStatus] = useState<TaskSummary['status']>(task?.status ?? initialStatus);
  const [isBlocked, setIsBlocked] = useState(task?.isBlocked ?? false);
  const [blockedReason, setBlockedReason] = useState(task?.blockedReason ?? '');

  const [selectedOwners, setSelectedOwners] = useState<string[]>(task?.owners?.map(o => o.id) ?? []);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(task?.assignees?.map(a => a.id) ?? []);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setError(null);
    setPending(true);
    try {
      const fullDesc = taskDesc + serializeAttachments(attachments);
      await onSave(
        taskTitle,
        fullDesc || undefined,
        taskStatus,
        taskPriority,
        isBlocked,
        isBlocked ? (blockedReason.trim() || 'Bloqueado') : null,
        selectedOwners,
        selectedAssignees
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
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] outline-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <CardHeader className="p-0 flex flex-row items-center gap-3">
            <ListTodo className="h-5 w-5 text-indigo-650" />
            <div>
              <CardTitle className="text-base">{task ? 'Modificar Tarea' : 'Nueva Tarea'}</CardTitle>
              <CardDescription>{task ? 'Detalles y parámetros de la tarea' : 'Añadir tarea al tablero'}</CardDescription>
            </div>
          </CardHeader>
        </div>
        {/* Scrollable body */}
        <CardContent className="p-0 overflow-hidden flex flex-col flex-1">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="grid grid-cols-[1fr_260px] divide-x divide-slate-100 dark:divide-slate-800 flex-1 min-h-0 overflow-hidden">

              {/* ── Left column: title + description + attachments ── */}
              <div className="flex flex-col gap-4 p-6 overflow-y-auto max-h-[73vh] flex-1">
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

                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-650 dark:text-slate-355">Descripción</span>
                  <div className="flex-1">
                    <RichTextEditor
                      value={taskDesc}
                      onChange={(html) => setTaskDesc(html)}
                      placeholder="Describe los pasos, requerimientos o contexto de la tarea..."
                    />
                  </div>
                </div>

                {/* Attachments */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3">
                  <AttachmentsSection
                    attachments={attachments}
                    onChange={setAttachments}
                  />
                </div>
              </div>

              {/* ── Right column: metadata ── */}
              <div className="flex flex-col gap-4 p-6 overflow-y-auto max-h-[73vh]">
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

                {/* Owners (Propietarios) selection */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Propietarios (Owners)</span>
                  <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30 space-y-1.5">
                    {members.map((m) => {
                      const isChecked = selectedOwners.includes(m.userId);
                      return (
                        <label key={m.userId} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-705 dark:text-slate-295">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOwners([...selectedOwners, m.userId]);
                              } else {
                                setSelectedOwners(selectedOwners.filter(id => id !== m.userId));
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-750 text-indigo-650 focus:ring-indigo-600 h-3.5 w-3.5 transition"
                          />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                    {members.length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">Sin miembros</span>
                    )}
                  </div>
                </div>

                {/* Assignees (Asignados) selection */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Asignados (Assignees)</span>
                  <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30 space-y-1.5">
                    {members.map((m) => {
                      const isChecked = selectedAssignees.includes(m.userId);
                      return (
                        <label key={m.userId} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-705 dark:text-slate-295">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAssignees([...selectedAssignees, m.userId]);
                              } else {
                                setSelectedAssignees(selectedAssignees.filter(id => id !== m.userId));
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-750 text-indigo-650 focus:ring-indigo-600 h-3.5 w-3.5 transition"
                          />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                    {members.length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">Sin miembros</span>
                    )}
                  </div>
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
                      Tarea bloqueada
                    </span>
                  </label>

                  {isBlocked && (
                    <label className="block text-sm text-slate-655 dark:text-slate-355">
                      <span className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-500">Motivo</span>
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
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 justify-between shrink-0 bg-white dark:bg-slate-900 rounded-b-2xl">
              <div className="flex items-center gap-2">
                {task && onDelete && (
                  <Button type="button" variant="danger" className="text-white" onClick={handleDelete} disabled={pending}>
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar</span>
                  </Button>
                )}
                {task && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="text-slate-650 dark:text-slate-355 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50 duration-150" /> : <Link className="h-4 w-4" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar enlace'}</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
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
