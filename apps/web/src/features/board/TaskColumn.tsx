import type { TaskSummary } from '@holocron/contracts';
import { Clock, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { statusLabel } from '../../lib/constants';
import { TaskCard } from './TaskCard';

type TaskColumnProps = {
  column: { status: TaskSummary['status']; tasks: TaskSummary[] };
  isLaneActive: boolean;
  canWrite: boolean;
  onDragOver: (e: React.DragEvent, status: TaskSummary['status']) => void;
  onDragEnter: (e: React.DragEvent, status: TaskSummary['status']) => void;
  onDragLeave: (status: TaskSummary['status']) => void;
  onDrop: (e: React.DragEvent, status: TaskSummary['status']) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onTaskClick: (task: TaskSummary) => void;
  onAddTask: (status: TaskSummary['status']) => void;
};

export function TaskColumn({
  column,
  isLaneActive,
  canWrite,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragStart,
  onTaskClick,
  onAddTask,
}: TaskColumnProps) {
  return (
    <section
      onDragOver={(e) => onDragOver(e, column.status)}
      onDragEnter={(e) => onDragEnter(e, column.status)}
      onDragLeave={() => onDragLeave(column.status)}
      onDrop={(e) => void onDrop(e, column.status)}
      className={cn(
        'rounded-xl border p-4 flex flex-col min-h-[450px] transition duration-200',
        isLaneActive
          ? 'border-indigo-500 bg-indigo-50/30 dark:border-indigo-400 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
          : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/35'
      )}
    >
      <div className="mb-4 flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          {column.status === 'TODO' && <Clock className="h-4 w-4 text-indigo-500" />}
          {column.status === 'IN_PROGRESS' && <Clock className="h-4 w-4 text-amber-500" />}
          {column.status === 'BLOCKED' && <AlertTriangle className="h-4 w-4 text-rose-500" />}
          {column.status === 'DONE' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {statusLabel[column.status]}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-650 dark:text-slate-350">
            {column.tasks.length}
          </span>
          {canWrite && (
            <button
              onClick={() => onAddTask(column.status)}
              className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 hover:text-indigo-650 dark:text-slate-355 dark:hover:text-indigo-400 hover:bg-slate-300 dark:hover:bg-slate-700/80"
              title="Añadir Tarea"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canWrite={canWrite}
            onDragStart={onDragStart}
            onClick={() => onTaskClick(task)}
          />
        ))}

        {!column.tasks.length ? (
          <div className="rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800/80 p-4 text-center text-xs text-slate-400 dark:text-slate-500 py-8">
            Arrastra tareas aquí
          </div>
        ) : null}
      </div>
    </section>
  );
}
