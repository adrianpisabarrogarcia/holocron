import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProjectSummary } from '@holocron/contracts';
import { usePagesStore } from '../../store/usePagesStore';
import { PageTreeSidebar } from './PageTreeSidebar';
import { PageEditor } from './PageEditor';
import { PageViewer } from './PageViewer';
import { PageVersionHistory } from './PageVersionHistory';
import { Button } from '../../components/ui/button';
import { Plus, BookOpen } from 'lucide-react';

type PagesPageProps = {
  currentProject: ProjectSummary | null;
  onProjectChange: (projectId: string) => Promise<void>;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  userRole: string;
};

export function PagesPage({ currentProject, userRole }: PagesPageProps) {
  const {
    pages,
    activePage,
    versions,
    selectedVersion,
    loadPages,
    loadPage,
    createPage,
    updatePage,
    deletePage,
    reorderPages,
    loadVersions,
    loadVersion,
    restoreVersion,
    clearActivePage,
  } = usePagesStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = searchParams.get('page');

  const [isEditing, setIsEditing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [reparentError, setReparentError] = useState<string | null>(null);

  const isViewer = currentProject?.membershipRole === 'VIEWER';
  const canWrite = !isViewer || userRole === 'ADMIN';

  useEffect(() => {
    if (!reparentError) return;
    const timeout = setTimeout(() => setReparentError(null), 3000);
    return () => clearTimeout(timeout);
  }, [reparentError]);

  useEffect(() => {
    if (currentProject) {
      void loadPages(currentProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  useEffect(() => {
    if (currentProject && pageParam) {
      void loadPage(currentProject.id, pageParam);
      setIsEditing(false);
    } else if (!pageParam) {
      clearActivePage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, pageParam]);

  const openPage = (pageId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (currentProject) next.set('project', currentProject.id);
      if (pageId) next.set('page', pageId);
      else next.delete('page');
      return next;
    });
  };

  const handleSelect = (pageId: string) => {
    setIsEditing(false);
    openPage(pageId);
  };

  const handleCreateChild = async (parentPageId: string | null) => {
    if (!currentProject) return;
    const created = await createPage(currentProject.id, 'Página sin título', '', parentPageId);
    setIsEditing(true);
    openPage(created.id);
  };

  const handleReparent = async (pageId: string, parentPageId: string | null) => {
    if (!currentProject) return;
    setReparentError(null);
    try {
      await updatePage(currentProject.id, pageId, { parentPageId });
    } catch (err) {
      setReparentError(err instanceof Error ? err.message : 'No se pudo mover la página');
    }
  };

  const handleReorder = async (parentPageId: string | null, orderedPageIds: string[]) => {
    if (!currentProject) return;
    setReparentError(null);
    try {
      await reorderPages(currentProject.id, { parentPageId, orderedPageIds });
    } catch (err) {
      setReparentError(err instanceof Error ? err.message : 'No se pudo reordenar la página');
    }
  };

  const handleSave = async (title: string, content: string) => {
    if (!currentProject || !activePage) return;
    await updatePage(currentProject.id, activePage.id, { title, content });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!currentProject || !activePage) return;
    if (!window.confirm(`¿Borrar "${activePage.title}" y todas sus subpáginas?`)) return;
    await deletePage(currentProject.id, activePage.id);
    openPage(null);
  };

  const handleOpenHistory = () => {
    if (!currentProject || !activePage) return;
    void loadVersions(currentProject.id, activePage.id);
    setIsHistoryOpen(true);
  };

  const handleSelectVersion = (versionId: string) => {
    if (!currentProject || !activePage) return;
    void loadVersion(currentProject.id, activePage.id, versionId);
  };

  const handleRestore = async (versionId: string) => {
    if (!currentProject || !activePage) return;
    await restoreVersion(currentProject.id, activePage.id, versionId);
    setIsHistoryOpen(false);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500 dark:text-slate-400">
        Seleccioná un proyecto para ver sus páginas.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
        {reparentError && (
          <div className="mx-2 mt-2 px-2.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-800/40">
            {reparentError}
          </div>
        )}
        <PageTreeSidebar
          pages={pages}
          activePageId={activePage?.id ?? null}
          onSelect={handleSelect}
          onCreateChild={handleCreateChild}
          onReparent={handleReparent}
          onReorder={handleReorder}
          onInvalidDrop={setReparentError}
          canWrite={canWrite}
        />
      </aside>

      <main className="flex-1 min-w-0">
        {!activePage && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pages.length === 0 ? 'Este proyecto todavía no tiene páginas.' : 'Elegí una página del árbol para verla.'}
            </p>
            {canWrite && (
              <Button variant="primary" onClick={() => handleCreateChild(null)}>
                <Plus className="h-4 w-4" /> Nueva página
              </Button>
            )}
          </div>
        )}

        {activePage && isEditing && (
          <PageEditor page={activePage} onSave={handleSave} onCancel={() => setIsEditing(false)} />
        )}

        {activePage && !isEditing && (
          <PageViewer
            page={activePage}
            canWrite={canWrite}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
            onOpenHistory={handleOpenHistory}
          />
        )}
      </main>

      {isHistoryOpen && (
        <PageVersionHistory
          versions={versions}
          selectedVersion={selectedVersion}
          onSelectVersion={handleSelectVersion}
          onRestore={handleRestore}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
}
