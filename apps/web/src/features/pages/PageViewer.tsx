import { useState } from 'react';
import type { PageDetail } from '@holocron/contracts';
import { Button } from '../../components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Pencil, Trash2, History, Link, Check } from 'lucide-react';

type PageViewerProps = {
  page: PageDetail;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenHistory: () => void;
};

export function PageViewer({ page, canWrite, onEdit, onDelete, onOpenHistory }: PageViewerProps) {
  const updatedAt = new Date(page.updatedAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{page.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Última edición por {page.updatedBy.name} · {updatedAt}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50 duration-150" /> : <Link className="h-4 w-4" />}
            <span>{copied ? '¡Copiado!' : 'Copiar enlace'}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenHistory}>
            <History className="h-4 w-4" /> Historial
          </Button>
          {canWrite && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button variant="danger" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <MarkdownRenderer content={page.content} />
      </div>
    </div>
  );
}
