import { FormEvent, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';
import type { TaskSummary } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ListTodo, Trash2, X, Link, Check, Play, Pause, Square, Clock } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';
import { cn } from '../../lib/cn';
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
export function formatHoursToReadable(hours: number): string {
  if (hours <= 0) return '0s';
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
}

// ----------------------------------------

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task: TaskSummary | null; // Null means create mode
  initialStatus?: TaskSummary['status'];
  initialSprintId?: string | null;
  onSave: (
    title: string,
    desc: string | undefined,
    status: TaskSummary['status'],
    priority: TaskSummary['priority'],
    isBlocked: boolean,
    blockedReason: string | null,
    ownerIds?: string[],
    assigneeIds?: string[],
    sprintId?: string | null,
    startDate?: string | null,
    endDate?: string | null,
    estimatedHours?: number | null,
    timeSpent?: number,
    timerStartedAt?: string | null
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
  columns: string[];
};

export function TaskModal({
  isOpen,
  onClose,
  task,
  initialStatus = 'TODO',
  initialSprintId = null,
  onSave,
  onDelete,
  columns,
}: TaskModalProps) {
  const { cleanHtml: initialHtml, attachments: initialAtts } = useMemo(
    () => parseAttachments(task?.description ?? ''),
    [task?.description]
  );

  const { members, sprints, updateTask } = useBoardStore();

  const [taskTitle, setTaskTitle] = useState(task?.title ?? '');
  const [taskDesc, setTaskDesc] = useState(initialHtml);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAtts);
  const [taskPriority, setTaskPriority] = useState<TaskSummary['priority']>(task?.priority ?? 'MEDIUM');
  const [taskStatus, setTaskStatus] = useState<TaskSummary['status']>(task?.status ?? initialStatus);
  const [isBlocked, setIsBlocked] = useState(task?.isBlocked ?? false);
  const [blockedReason, setBlockedReason] = useState(task?.blockedReason ?? '');

  const [selectedOwners, setSelectedOwners] = useState<string[]>(task?.owners?.map(o => o.id) ?? []);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(task?.assignees?.map(a => a.id) ?? []);
  const [sprintId, setSprintId] = useState<string | null>(task?.sprintId ?? initialSprintId ?? null);

  // Time tracking & scheduling states
  const [startDate, setStartDate] = useState(task?.startDate ? task.startDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(task?.endDate ? task.endDate.split('T')[0] : '');
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours !== null && task?.estimatedHours !== undefined ? String(task.estimatedHours) : '');
  const [timeSpent, setTimeSpent] = useState(task?.timeSpent ?? 0);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(task?.timerStartedAt ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Ticking effect for active timer
  useEffect(() => {
    if (!timerStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
      setElapsedSeconds(elapsed > 0 ? elapsed : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStartedAt]);

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
        selectedAssignees,
        sprintId,
        startDate || null,
        endDate || null,
        estimatedHours ? Number(estimatedHours) : null,
        timeSpent,
        timerStartedAt
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] outline-none">
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
            <div className="grid grid-cols-[1fr_380px] divide-x divide-slate-100 dark:divide-slate-800 flex-1 min-h-0 overflow-hidden">

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

                <label className="block text-sm text-slate-650 dark:text-slate-355">
                  <span className="mb-1 block font-medium">Sprint</span>
                  <select
                    className={fieldClassName}
                    value={sprintId ?? ''}
                    onChange={(e) => setSprintId(e.target.value || null)}
                  >
                    <option value="">Backlog general (Sin Sprint)</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status === 'ACTIVE' ? 'Activo' : s.status === 'COMPLETED' ? 'Completado' : 'Planificación'})
                      </option>
                    ))}
                  </select>
                </label>

                {/* FECHAS DE INICIO Y FIN, ESTIMACIÓN Y TRACKING */}
                <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Planificación y Tiempos</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm text-slate-650 dark:text-slate-355">
                      <span className="mb-1 block font-medium">Fecha Inicio</span>
                      <input
                        type="date"
                        className={fieldClassName}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </label>
                    
                    <label className="block text-sm text-slate-650 dark:text-slate-355">
                      <span className="mb-1 block font-medium">Fecha Fin</span>
                      <input
                        type="date"
                        className={fieldClassName}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <label className="block text-sm text-slate-650 dark:text-slate-355">
                      <span className="mb-1 block font-medium">Estimado (Horas)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Ej. 8"
                        className={fieldClassName}
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                      />
                    </label>

                    <div className="block text-sm text-slate-650 dark:text-slate-355">
                      <span className="mb-1 block font-medium">Invertido (Horas)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className={fieldClassName}
                        value={timeSpent}
                        onChange={(e) => setTimeSpent(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* TIMER SECTION (Only in edit mode / task exists) */}
                  {task && (
                    <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className={cn("h-4 w-4 text-slate-400", timerStartedAt && "text-indigo-500 animate-pulse")} />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cronómetro de Tarea</span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                          timerStartedAt 
                            ? "bg-red-50 text-red-600 border-red-200/40 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30" 
                            : "bg-slate-100 text-slate-500 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50"
                        )}>
                          {timerStartedAt ? 'Corriendo' : 'Pausado'}
                        </span>
                      </div>

                      {/* Centered Large Digital Clock */}
                      {timerStartedAt && (
                        <div className="flex items-center justify-center py-2.5 gap-3 bg-red-500/[0.02] dark:bg-red-500/[0.01] rounded-xl border border-dashed border-red-500/10">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
                          <span className="font-mono text-2xl font-black text-slate-800 dark:text-slate-100 tracking-wider">
                            {new Date(elapsedSeconds * 1000).toISOString().substr(11, 8)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!timerStartedAt ? (
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                              const now = new Date().toISOString();
                              setTimerStartedAt(now);
                              // Auto-update timer in background
                              updateTask(task.id, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, now);
                            }}
                            className="flex-1 text-xs py-1.5 h-8.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                          >
                            <Play className="h-3.5 w-3.5 fill-white text-white" /> Iniciar Tracking
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => {
                                const seconds = elapsedSeconds;
                                const additionalHours = Number((seconds / 3600).toFixed(5));
                                const newTimeSpent = Number((timeSpent + additionalHours).toFixed(5));
                                setTimeSpent(newTimeSpent);
                                setTimerStartedAt(null);
                                setElapsedSeconds(0);
                                updateTask(task.id, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, newTimeSpent, null);
                              }}
                              className="flex-1 text-xs py-1.5 h-8.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <Pause className="h-3.5 w-3.5 fill-white text-white" /> Pausar y Guardar
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                if (confirm("¿Estás seguro de que quieres detener el cronómetro sin guardar el tiempo transcurrido?")) {
                                  setTimerStartedAt(null);
                                  setElapsedSeconds(0);
                                  updateTask(task.id, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, null);
                                }
                              }}
                              className="text-xs py-1.5 px-3 h-8.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                            >
                              <Square className="h-3.5 w-3.5 fill-current text-slate-500" /> Cancelar
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Estimation Progress Bar */}
                      {estimatedHours && Number(estimatedHours) > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-450 dark:text-slate-550">
                            <span>Progreso: {Math.round((timeSpent / Number(estimatedHours)) * 100)}%</span>
                            <span>{formatHoursToReadable(timeSpent)} / {estimatedHours}h</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-300", 
                                timeSpent > Number(estimatedHours) ? "bg-rose-500" : "bg-indigo-500"
                              )} 
                              style={{ width: `${Math.min(100, (timeSpent / Number(estimatedHours)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
    </div>,
    document.body
  );
}
