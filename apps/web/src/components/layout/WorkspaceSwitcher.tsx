import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoardStore } from '../../store/useBoardStore';
import type { AuthenticatedUser, WorkspaceSummary } from '@holocron/contracts';

type WorkspaceSwitcherProps = {
  className?: string;
};

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces, activeWorkspace: storeActiveWorkspace, loadWorkspaces, switchWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const resetBoard = useBoardStore((s) => s.resetBoard);
  const user = useAuthStore((s) => s.user) as AuthenticatedUser | null;
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Extraer el slug actual de la URL
  const urlSlug = location.pathname.match(/^\/workspace\/([^/]+)/)?.[1] ?? null;

  // Load workspaces on mount
  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  // Sincronizar el workspace activo del store con la URL cuando estamos en una ruta de workspace
  useEffect(() => {
    if (urlSlug && workspaces.length > 0) {
      const wsFromUrl = workspaces.find((ws) => ws.slug === urlSlug);
      if (wsFromUrl && wsFromUrl.slug !== storeActiveWorkspace?.slug) {
        setActiveWorkspace(wsFromUrl);
      }
    }
  }, [urlSlug, workspaces, storeActiveWorkspace, setActiveWorkspace]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fuente de verdad: store > URL > primer workspace
  const activeWorkspace: WorkspaceSummary | null =
    storeActiveWorkspace ??
    (urlSlug ? workspaces.find((ws) => ws.slug === urlSlug) ?? null : null) ??
    workspaces[0] ??
    null;

  const currentSlug = activeWorkspace?.slug ?? urlSlug;

  const handleSwitch = async (slug: string) => {
    if (switching) return;
    // Si ya estamos en ese workspace, solo cerramos el dropdown
    if (slug === currentSlug) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    setSwitchError(null);
    setOpen(false);

    try {
      // 1. Avisar al backend del cambio de workspace activo
      await switchWorkspace(slug);

      // 2. Limpiar el board store para que no muestre datos del workspace anterior
      resetBoard();

      // 3. Navegar a la misma sub-página en el nuevo workspace (solo si estamos en una ruta de workspace)
      const isWorkspaceRoute = location.pathname.startsWith('/workspace/');
      if (isWorkspaceRoute) {
        const subPath = location.pathname.replace(/^\/workspace\/[^/]+/, '') || '/overview';
        navigate(`/workspace/${slug}${subPath}`, { replace: false });
      }
    } catch (err) {
      console.error('Failed to switch workspace:', err);
      setSwitchError(err instanceof Error ? err.message : 'Error al cambiar workspace');
    } finally {
      setSwitching(false);
    }
  };

  if (workspaces.length === 0) return null;

  const isSuperAdmin = user?.platformRole === 'SUPERADMIN';
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-sm font-semibold',
          'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700',
          'hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm',
          switching && 'opacity-60 cursor-not-allowed'
        )}
      >
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        ) : activeWorkspace ? (
          <>
            <span
              className="h-5 w-5 rounded-md flex items-center justify-center text-white text-[10px] font-black shrink-0 overflow-hidden"
              style={{ backgroundColor: activeWorkspace.primaryColor ?? '#6366f1' }}
            >
              {activeWorkspace.logoUrl ? (
                <img src={`${apiBase}${activeWorkspace.logoUrl}`} alt={activeWorkspace.name} className="h-full w-full object-cover" />
              ) : (
                activeWorkspace.name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="max-w-[120px] truncate text-slate-700 dark:text-slate-200">
              {activeWorkspace.name}
            </span>
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500">Workspace</span>
          </>
        )}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {switchError && (
        <div className="absolute left-0 top-full mt-1 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/30 z-50 w-64">
          {switchError}
        </div>
      )}

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Mis Workspaces
            </p>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => void handleSwitch(ws.slug)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  ws.slug === currentSlug && 'bg-indigo-50 dark:bg-indigo-950/30'
                )}
              >
                <span
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm overflow-hidden"
                  style={{ backgroundColor: ws.primaryColor ?? '#6366f1' }}
                >
                  {ws.logoUrl ? (
                    <img src={`${apiBase}${ws.logoUrl}`} alt={ws.name} className="h-full w-full object-cover" />
                  ) : (
                    ws.name.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-semibold truncate', ws.slug === currentSlug ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100')}>
                    {ws.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">/{ws.slug}</p>
                </div>
                {ws.slug === currentSlug && (
                  <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
          {isSuperAdmin && (
            <div className="border-t border-slate-100 dark:border-slate-800 p-1">
              <button
                onClick={() => { setOpen(false); navigate('/admin/workspaces'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Gestionar Workspaces
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
