import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { UsersPage, UsersPageProps } from '../users/UsersPage';
import { ProjectsAdminPage } from './ProjectsAdminPage';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/cn';
import { Users, Folder } from 'lucide-react';

type AdminPageProps = Omit<UsersPageProps, 'onRefreshUsers'> & {
  onRefreshUsers: () => void;
};

export function AdminPage(props: AdminPageProps) {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentTab = searchParams.get('tab') || 'users';

  if (!user || user.platformRole !== 'ADMIN') {
    return <Navigate replace to="/overview" />;
  }

  const setTab = (tab: 'users' | 'projects') => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      {/* TABS NAVIGATION */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setTab('users')}
            className={cn(
              'flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition duration-200',
              currentTab === 'users'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            )}
          >
            <Users className="h-4.5 w-4.5" />
            <span>Usuarios</span>
          </button>
          <button
            onClick={() => setTab('projects')}
            className={cn(
              'flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition duration-200',
              currentTab === 'projects'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            )}
          >
            <Folder className="h-4.5 w-4.5" />
            <span>Proyectos</span>
          </button>
        </nav>
      </div>

      {/* TAB CONTENT */}
      <div>
        {currentTab === 'users' ? (
          <UsersPage {...props} />
        ) : (
          <ProjectsAdminPage />
        )}
      </div>
    </div>
  );
}
