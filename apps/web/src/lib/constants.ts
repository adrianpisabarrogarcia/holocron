import type { TaskSummary, ProjectSummary } from '@holocron/contracts';

export const statusOrder: TaskSummary['status'][] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

export const statusTone: Record<TaskSummary['status'], string> = {
  TODO: 'text-indigo-500 dark:text-indigo-400',
  IN_PROGRESS: 'text-amber-500 dark:text-amber-400',
  BLOCKED: 'text-rose-500 dark:text-rose-400',
  DONE: 'text-emerald-500 dark:text-emerald-400',
};

export const statusBg: Record<TaskSummary['status'], string> = {
  TODO: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50',
  IN_PROGRESS: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
  BLOCKED: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/50',
  DONE: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
};

export const statusLabel: Record<TaskSummary['status'], string> = {
  TODO: 'Por Hacer',
  IN_PROGRESS: 'En Progreso',
  BLOCKED: 'Bloqueado',
  DONE: 'Completado',
};

export const projectStatusLabel: Record<ProjectSummary['status'], string> = {
  PLANNING: 'Planificación',
  ACTIVE: 'Activo',
  ON_HOLD: 'En Pausa',
  COMPLETED: 'Completado',
  ARCHIVED: 'Archivado',
};

export const projectStatusTone: Record<ProjectSummary['status'], string> = {
  PLANNING: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/30',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-indigo-900/30',
  ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-indigo-900/30',
  COMPLETED: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/30',
  ARCHIVED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700/60',
};

export const priorityTone: Record<TaskSummary['priority'], string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700/60',
  MEDIUM: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/30',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30',
  URGENT: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30',
};

export const fieldClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500';
