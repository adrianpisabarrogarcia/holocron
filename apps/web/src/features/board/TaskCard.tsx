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
        'rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition duration-200',
        canWrite ? 'cursor-grab active:cursor-grabbing hover:border-slate-300 dark:hover:border-slate-750' : 'cursor-default'
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
    </article>
  );
}
