import { createPortal } from 'react-dom';
import type { PageVersionSummary, PageVersionDetail } from '@holocron/contracts';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { Button } from '../../components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { X, RotateCcw } from 'lucide-react';

type PageVersionHistoryProps = {
  versions: PageVersionSummary[];
  selectedVersion: PageVersionDetail | null;
  onSelectVersion: (versionId: string) => void;
  onRestore: (versionId: string) => Promise<void>;
  onClose: () => void;
};

export function PageVersionHistory({ versions, selectedVersion, onSelectVersion, onRestore, onClose }: PageVersionHistoryProps) {
  useEscapeKey(onClose, true);

  const handleRestore = async () => {
    if (!selectedVersion) return;
    await onRestore(selectedVersion.id);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] outline-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historial de versiones</h2>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          <div className="md:col-span-1 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-2">
            {versions.length === 0 && (
              <p className="px-2 py-4 text-xs text-slate-400 dark:text-slate-500">Sin versiones anteriores todavía.</p>
            )}
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => onSelectVersion(version.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 mb-1 transition ${
                  selectedVersion?.id === version.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <p className="text-sm font-semibold truncate">{version.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {version.editedBy.name} · {new Date(version.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 overflow-y-auto p-6">
            {selectedVersion ? (
              <MarkdownRenderer content={selectedVersion.content} />
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">Elegí una versión para previsualizarla.</p>
            )}
          </div>
        </div>

        {selectedVersion && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Button variant="primary" onClick={handleRestore}>
              <RotateCcw className="h-4 w-4" /> Restaurar esta versión
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
