import type { TaskSummary } from '@holocron/contracts';
import { cn } from '../../lib/cn';
import { priorityTone } from '../../lib/constants';
import { getApiUrl } from '../../lib/api';

type TaskCardProps = {
  task: TaskSummary;
  canWrite: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetTaskId: string, targetStatus: string) => void;
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch (e) {
    return html.replace(/<[^>]*>/g, '');
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

export function TaskCard({ task, canWrite, onDragStart, onClick, onDragOver, onDrop }: TaskCardProps) {
  const plainDescription = stripHtml(task.description);

  return (
    <article
      draggable={canWrite}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, task.id, task.status)}
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition duration-200',
        canWrite ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        task.isBlocked
          ? 'border-rose-300 dark:border-rose-900 bg-rose-50/10 dark:bg-rose-950/10 shadow-sm shadow-rose-100 dark:shadow-none ring-1 ring-rose-500/10'
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-750'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
          {task.title}
        </h3>
        <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${priorityTone[task.priority]} shrink-0`}>
          {task.priority}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
        {plainDescription || 'Sin descripción añadida.'}
      </p>

      {/* Time Tracking & Dates Summary */}
      {(task.startDate || task.endDate || task.estimatedHours || task.timeSpent > 0 || task.timerStartedAt) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          {/* Dates */}
          {task.startDate || task.endDate ? (
            <div className="flex items-center gap-1">
              <span>📅</span>
              <span>
                {task.startDate ? new Date(task.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
                {task.startDate && task.endDate ? ' - ' : ''}
                {task.endDate ? new Date(task.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
              </span>
            </div>
          ) : <div />}

          {/* Time Tracking Progress */}
          {(task.estimatedHours || task.timeSpent > 0 || task.timerStartedAt) && (
            <div className="flex items-center gap-1.5 ml-auto shrink-0 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800/80">
              {task.timerStartedAt && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse mr-0.5" />
              )}
              <span>⏱️</span>
              <span className={cn(task.timerStartedAt && "text-red-500 font-extrabold")}>
                {formatHoursToReadable(task.timeSpent)}{task.estimatedHours ? ` / ${task.estimatedHours}h` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {task.isBlocked && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 p-2 text-[10px] font-bold text-rose-700 dark:text-rose-450 border border-rose-100/50 dark:border-rose-900/35">
          <span className="shrink-0">⚠️</span>
          <span className="break-words">Bloqueada: {task.blockedReason || 'Sin motivo especificado'}</span>
        </div>
      )}

      {/* Owners and Assignees Row */}
      {((task.owners && task.owners.length > 0) || (task.assignees && task.assignees.length > 0)) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-[10px]">
          {/* Owners section */}
          {task.owners && task.owners.length > 0 ? (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Owners:</span>
              <div className="flex -space-x-1.5">
                {task.owners.map((o) => {
                  const initials = o.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <div key={o.id} className="relative group shrink-0">
                      <div
                        className="h-5 w-5 rounded-full bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center font-extrabold text-[8px] tracking-tighter cursor-help overflow-hidden shrink-0"
                      >
                        {o.avatarUrl ? (
                          <img
                            src={getApiUrl(o.avatarUrl)}
                            alt={o.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 rounded bg-slate-900 dark:bg-slate-950 text-white text-[9px] font-semibold px-2 py-0.5 whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-slate-700/50">
                        {o.name} (Owner)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <div />}

          {/* Assignees section */}
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Asignados:</span>
              <div className="flex -space-x-1.5">
                {task.assignees.map((a) => {
                  const initials = a.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <div key={a.id} className="relative group shrink-0">
                      <div
                        className="h-5 w-5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-center font-extrabold text-[8px] tracking-tighter cursor-help overflow-hidden shrink-0"
                      >
                        {a.avatarUrl ? (
                          <img
                            src={getApiUrl(a.avatarUrl)}
                            alt={a.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 rounded bg-slate-900 dark:bg-slate-950 text-white text-[9px] font-semibold px-2 py-0.5 whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-slate-700/50">
                        {a.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
