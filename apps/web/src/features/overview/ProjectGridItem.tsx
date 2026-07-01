import type { ProjectSummary } from '@holocron/contracts';
import { Folder, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { projectStatusLabel, projectStatusTone } from '../../lib/constants';

type ProjectGridItemProps = {
  proj: ProjectSummary;
  isSelected: boolean;
  canManage: boolean;
  onSelect: (id: string) => void;
  onEdit: (proj: ProjectSummary, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
};

export function ProjectGridItem({
  proj,
  isSelected,
  canManage,
  onSelect,
  onEdit,
  onDelete,
}: ProjectGridItemProps) {
  return (
    <div
      onClick={() => onSelect(proj.id)}
      className={cn(
        'flex items-center justify-between p-4 rounded-xl border transition cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group duration-200',
        isSelected
          ? 'border-indigo-600/35 bg-indigo-50/20 dark:border-indigo-500/35 dark:bg-indigo-950/15'
          : 'border-slate-200/85 bg-white dark:border-slate-800 dark:bg-slate-900/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center transition',
          isSelected 
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 dark:bg-indigo-500' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        )}>
          <Folder className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{proj.name}</h3>
            <span className={`text-[10px] font-bold border px-1.5 py-0.2 rounded-md ${projectStatusTone[proj.status]}`}>
              {projectStatusLabel[proj.status]}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs mt-0.5">{proj.description || 'Sin descripción'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canManage && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => onEdit(proj, e)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Editar Proyecto"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => onDelete(proj.id, proj.name, e)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Eliminar Proyecto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {isSelected && (
          <span className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 flex items-center gap-1">
            Activo <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
