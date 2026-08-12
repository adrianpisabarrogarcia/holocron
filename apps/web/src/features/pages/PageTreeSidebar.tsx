import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageSummary } from '@holocron/contracts';
import { FileText, Plus, Home } from 'lucide-react';
import { cn } from '../../lib/cn';

type PageTreeSidebarProps = {
  pages: PageSummary[];
  activePageId: string | null;
  onSelect: (pageId: string) => void;
  onCreateChild: (parentPageId: string | null) => void;
  onReparent: (pageId: string, parentPageId: string | null) => void;
  onReorder: (parentPageId: string | null, orderedPageIds: string[]) => void;
  onInvalidDrop?: (reason: string) => void;
  canWrite: boolean;
};

type DropTarget =
  | { kind: 'root' }
  | { kind: 'before' | 'after' | 'inside'; pageId: string };

const DRAG_THRESHOLD_PX = 6;
// Top/bottom slice of a row counts as "insert before/after"; the middle slice nests inside it.
const EDGE_ZONE_RATIO = 0.28;

function getFlattenedTree(pages: PageSummary[]) {
  const list: Array<{ page: PageSummary; depth: number }> = [];

  const recurse = (parentId: string | null, depth: number) => {
    pages
      .filter((page) => page.parentPageId === parentId)
      .sort((a, b) => a.position - b.position)
      .forEach((page) => {
        list.push({ page, depth });
        recurse(page.id, depth + 1);
      });
  };

  recurse(null, 0);
  return list;
}

function getDescendantIds(pages: PageSummary[], rootId: string): Set<string> {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    pages
      .filter((page) => page.parentPageId === current)
      .forEach((child) => {
        ids.add(child.id);
        stack.push(child.id);
      });
  }
  return ids;
}

export function PageTreeSidebar({ pages, activePageId, onSelect, onCreateChild, onReparent, onReorder, onInvalidDrop, canWrite }: PageTreeSidebarProps) {
  const items = getFlattenedTree(pages);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DropTarget | null>(null);

  const dragStateRef = useRef<{ pageId: string; startX: number; startY: number; dragging: boolean } | null>(null);
  const suppressNextClickRef = useRef(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const resolveTargetFromPoint = useCallback((x: number, y: number): DropTarget | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const targetEl = el?.closest('[data-drop-target]') as HTMLElement | null;
    if (!targetEl) return null;
    const value = targetEl.getAttribute('data-drop-target');
    if (!value) return null;
    if (value === 'root') return { kind: 'root' };
    const rect = targetEl.getBoundingClientRect();
    const relativeY = rect.height > 0 ? (y - rect.top) / rect.height : 0.5;
    if (relativeY < EDGE_ZONE_RATIO) return { kind: 'before', pageId: value };
    if (relativeY > 1 - EDGE_ZONE_RATIO) return { kind: 'after', pageId: value };
    return { kind: 'inside', pageId: value };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      if (!state.dragging) {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        state.dragging = true;
        setDraggedPageId(state.pageId);
      }
      setDragOverTarget(resolveTargetFromPoint(e.clientX, e.clientY));
    };

    const handleMouseUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      dragStateRef.current = null;
      setDraggedPageId(null);
      setDragOverTarget(null);
      if (!state || !state.dragging) return;
      suppressNextClickRef.current = true;

      const target = resolveTargetFromPoint(e.clientX, e.clientY);
      if (!target) return;

      const pages = pagesRef.current;
      const draggedId = state.pageId;
      const draggedPage = pages.find((page) => page.id === draggedId);
      if (!draggedPage) return;

      if (target.kind === 'root') {
        if (draggedPage.parentPageId === null) {
          onInvalidDrop?.('Esa página ya está en la raíz.');
          return;
        }
        onReparent(draggedId, null);
        return;
      }

      if (target.pageId === draggedId) return;

      if (target.kind === 'inside') {
        if (draggedPage.parentPageId === target.pageId) {
          onInvalidDrop?.('Esa página ya está dentro de esta.');
          return;
        }
        if (getDescendantIds(pages, draggedId).has(target.pageId)) {
          onInvalidDrop?.('No podés mover una página dentro de una de sus propias subpáginas.');
          return;
        }
        onReparent(draggedId, target.pageId);
        return;
      }

      // before / after: reorder as a sibling of the target page
      const targetPage = pages.find((page) => page.id === target.pageId);
      if (!targetPage) return;
      if (getDescendantIds(pages, draggedId).has(targetPage.id)) {
        onInvalidDrop?.('No podés mover una página dentro de una de sus propias subpáginas.');
        return;
      }

      const newParentId = targetPage.parentPageId;
      const siblings = pages
        .filter((page) => page.parentPageId === newParentId && page.id !== draggedId)
        .sort((a, b) => a.position - b.position);

      const targetIndex = siblings.findIndex((page) => page.id === targetPage.id);
      const insertIndex = target.kind === 'before' ? targetIndex : targetIndex + 1;

      const reordered = [...siblings];
      reordered.splice(insertIndex, 0, draggedPage);

      onReorder(newParentId, reordered.map((page) => page.id));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resolveTargetFromPoint, onReparent, onReorder, onInvalidDrop]);

  const handleRowMouseDown = (e: React.MouseEvent, pageId: string) => {
    if (!canWrite || e.button !== 0) return;
    dragStateRef.current = { pageId, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  const handleRowClick = (pageId: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onSelect(pageId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Páginas</span>
        {canWrite && (
          <button
            onClick={() => onCreateChild(null)}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Nueva página"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {canWrite && draggedPageId && (
        <div
          data-drop-target="root"
          className={cn(
            'mx-2 mb-1 flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-xs transition',
            dragOverTarget?.kind === 'root'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
              : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500',
          )}
        >
          <Home className="h-3.5 w-3.5" />
          <span>Mover a la raíz</span>
        </div>
      )}

      <div className={cn('flex-1 overflow-y-auto space-y-0.5 px-2 pb-2', draggedPageId && 'select-none')}>
        {items.length === 0 && (
          <p className="px-2 py-4 text-xs text-slate-400 dark:text-slate-500">Todavía no hay páginas.</p>
        )}
        {items.map(({ page, depth }) => {
          const isDropInside = dragOverTarget?.kind === 'inside' && dragOverTarget.pageId === page.id;
          const isDropBefore = dragOverTarget?.kind === 'before' && dragOverTarget.pageId === page.id;
          const isDropAfter = dragOverTarget?.kind === 'after' && dragOverTarget.pageId === page.id;

          return (
            <div
              key={page.id}
              data-drop-target={page.id}
              role="button"
              tabIndex={0}
              style={{ paddingLeft: depth * 14 + 8 }}
              onMouseDown={(e) => handleRowMouseDown(e, page.id)}
              onClick={() => handleRowClick(page.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(page.id);
              }}
              className={cn(
                'group flex items-center gap-1.5 min-w-0 rounded-lg pr-1 py-1.5 text-left text-sm transition',
                draggedPageId === page.id && 'opacity-40',
                isDropInside && 'bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-400',
                isDropBefore && 'shadow-[0_-2px_0_0_theme(colors.indigo.500)]',
                isDropAfter && 'shadow-[0_2px_0_0_theme(colors.indigo.500)]',
                !isDropInside &&
                  (activePageId === page.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'),
                canWrite && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{page.title}</span>
              {canWrite && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateChild(page.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                  title="Nueva subpágina"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
