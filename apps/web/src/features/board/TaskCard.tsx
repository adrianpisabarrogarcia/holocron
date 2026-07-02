import type { TaskSummary } from '@holocron/contracts';
import { cn } from '../../lib/cn';
import { priorityTone } from '../../lib/constants';

type TaskCardProps = {
  task: TaskSummary;
  canWrite: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
};

export function TaskCard({ task, canWrite, onDragStart, onClick }: TaskCardProps) {
  return (
    <article
      draggable={canWrite}
      onDragStart={(e) => onDragStart(e, task.id)}
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
        {task.description || 'Sin descripción añadida.'}
      </p>

      {task.isBlocked && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 p-2 text-[10px] font-bold text-rose-700 dark:text-rose-450 border border-rose-100/50 dark:border-rose-900/35">
          <span className="shrink-0">⚠️</span>
          <span className="break-words">Bloqueada: {task.blockedReason || 'Sin motivo especificado'}</span>
        </div>
      )}
    </article>
  );
}
