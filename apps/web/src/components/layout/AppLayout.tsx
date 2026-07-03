import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { ProjectSummary, AuthenticatedUser } from '@holocron/contracts';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';
import { useBoardStore } from '../../store/useBoardStore';
import {
  LayoutDashboard,
  KanbanSquare,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Folder,
  RefreshCw,
  UserCircle,
  Key,
  Link,
  Check,
} from 'lucide-react';

type AppLayoutProps = {
  children: ReactNode;
  user: AuthenticatedUser;
  isAdmin: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  logout: () => Promise<void>;
  pathname: string;
  projects: ProjectSummary[];
  boardSelectedProjectId: string | null;
  handleProjectChange: (projectId: string) => Promise<void>;
  loading: boolean;
  loadBoard: () => Promise<void>;
};

export function AppLayout({
  children,
  user,
  isAdmin,
  theme,
  setTheme,
  logout,
  pathname,
  projects,
  boardSelectedProjectId,
  handleProjectChange,
  loading,
  loadBoard,
}: AppLayoutProps) {
  const { folders } = useBoardStore();
  const [projectCopied, setProjectCopied] = useState(false);

  const handleCopyProjectLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setProjectCopied(true);
    setTimeout(() => setProjectCopied(false), 2000);
  };

  const getHierarchicalProjects = () => {
    const list: Array<{
      type: 'project' | 'folder';
      id: string;
      name: string;
      depth: number;
      disabled?: boolean;
    }> = [];

    const recurse = (parentId: string | null, depth: number) => {
      folders
        .filter((f) => f.parentFolderId === parentId)
        .forEach((f) => {
          list.push({ type: 'folder', id: f.id, name: f.name, depth, disabled: true });
          recurse(f.id, depth + 1);
        });

      projects
        .filter((p) => p.folderId === parentId)
        .forEach((p) => {
          list.push({ type: 'project', id: p.id, name: p.name, depth });
        });
    };

    recurse(null, 0);

    // Add orphaned projects at root
    projects.forEach((p) => {
      if (!list.some((item) => item.type === 'project' && item.id === p.id)) {
        list.push({ type: 'project', id: p.id, name: p.name, depth: 0 });
      }
    });

    return list;
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="text-xs font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">Holocron Workspace</span>
          </div>

          {/* User profile brief */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-650 dark:text-slate-355">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100 leading-tight">{user.name}</p>
                <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 mt-0.5">
                  {user.platformRole}
                </span>
              </div>
            </div>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1.5">
            <NavLink
              to="/overview"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                )
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Resumen</span>
            </NavLink>

            <NavLink
              to="/board"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                )
              }
            >
              <KanbanSquare className="h-4 w-4" />
              <span>Tablero de Tareas</span>
            </NavLink>

            {isAdmin ? (
              <>
                <div className="pt-4 pb-1">
                  <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                    Administración
                  </p>
                </div>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Gestión Usuarios</span>
                </NavLink>
                <NavLink
                  to="/admin/projects"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    )
                  }
                >
                  <Folder className="h-4 w-4" />
                  <span>Gestión Proyectos</span>
                </NavLink>
                <NavLink
                  to="/admin/access"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-600 dark:border-indigo-400 pl-3'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    )
                  }
                >
                  <Key className="h-4 w-4" />
                  <span>Gestión Accesos</span>
                </NavLink>
              </>
            ) : null}
          </nav>
        </div>

        {/* Sidebar Footer: Theme Toggle & Logout */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1.5">Apariencia</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  'p-1.5 rounded-lg transition duration-200',
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                )}
                title="Modo Claro"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  'p-1.5 rounded-lg transition duration-200',
                  theme === 'dark'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                )}
                title="Modo Oscuro"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button
            onClick={() => void logout()}
            className="w-full justify-start text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
            variant="ghost"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 holocron-grid">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {pathname === '/overview' && 'Resumen del Sistema'}
              {pathname === '/board' && 'Tablero del Proyecto'}
              {pathname.startsWith('/admin') && 'Panel de Administración'}
            </h1>
            
            {projects.length > 0 && (
              <div className="w-64 flex items-center gap-2">
                <Folder className="h-4 w-4 text-indigo-650 dark:text-indigo-400 shrink-0" />
                <select
                  className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-355 outline-none cursor-pointer hover:text-indigo-655 dark:hover:text-indigo-400 transition"
                  value={boardSelectedProjectId ?? ''}
                  onChange={(e) => void handleProjectChange(e.target.value)}
                >
                  {getHierarchicalProjects().map((item) => (
                    <option
                      key={item.type + '-' + item.id}
                      value={item.type === 'project' ? item.id : ''}
                      disabled={item.disabled}
                      className={cn(
                        'dark:bg-slate-900',
                        item.type === 'folder' ? 'text-slate-400 font-bold dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {'\u00A0\u00A0'.repeat(item.depth)}
                      {item.type === 'folder' ? '📁 ' : '📄 '}
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCopyProjectLink}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-650 transition shrink-0 ml-1 flex items-center justify-center"
                  title="Copiar enlace de esta vista"
                >
                  {projectCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Link className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void loadBoard()}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span>{loading ? 'Sincronizando...' : 'Actualizar'}</span>
            </Button>
          </div>
        </header>

        {/* Page Body Wrapper */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
