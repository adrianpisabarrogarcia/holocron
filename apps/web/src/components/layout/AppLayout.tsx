import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { ProjectSummary, AuthenticatedUser } from '@holocron/contracts';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';
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
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200/80 dark:border-slate-800/80 gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-650 text-white font-bold text-lg shadow-md shadow-indigo-650/15">
              H
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">Holocron</h2>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">Workspace</span>
            </div>
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
              <NavLink
                to="/admin"
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
                <span>Administración</span>
              </NavLink>
            ) : null}
          </nav>
        </div>

        {/* Sidebar Footer: Theme Toggle & Logout */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-slate-955/50">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">Apariencia</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  'p-1.5 rounded-lg transition duration-200',
                  theme === 'light'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-transparent'
                    : 'text-slate-400 hover:text-slate-650'
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
                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
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
              {pathname === '/admin' && 'Panel de Administración'}
            </h1>
            
            {projects.length > 0 && (
              <div className="w-64 flex items-center gap-2">
                <Folder className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <select
                  className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-355 outline-none cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  value={boardSelectedProjectId ?? ''}
                  onChange={(e) => void handleProjectChange(e.target.value)}
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="dark:bg-slate-900">
                      {proj.name}
                    </option>
                  ))}
                </select>
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
