import { FormEvent, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import type { PlatformRole, ProjectMembershipRole } from '@holocron/contracts';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { cn } from './lib/cn';
import { useAdminStore } from './store/useAdminStore';
import { useAuthStore } from './store/useAuthStore';
import { useBoardStore } from './store/useBoardStore';
import {
  RefreshCw,
  Ban,
  Database
} from 'lucide-react';
import { statusOrder, fieldClassName } from './lib/constants';

// Modular layouts and page components
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './features/overview/OverviewPage';
import { BoardPage } from './features/board/BoardPage';
import { SprintsPage } from './features/sprints/SprintsPage';
import { TimelinePage } from './features/timeline/TimelinePage';
import { AdminPage } from './features/admin/AdminPage';
import { ProjectsAdminPage } from './features/admin/ProjectsAdminPage';
import { AccessAdminPage } from './features/admin/AccessAdminPage';
import { CreateProjectCard } from './features/overview/CreateProjectCard';

type RouteState = {
  denied?: 'admin';
};

export function App() {
  const [email, setEmail] = useState('adrian.pisabarro.garcia@gmail.com');
  const [magicLinkSentMessage, setMagicLinkSentMessage] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<PlatformRole>('MEMBER');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [membershipProjectId, setMembershipProjectId] = useState('');
  const [selectedMembershipRole, setSelectedMembershipRole] = useState<ProjectMembershipRole>('CONTRIBUTOR');
  const [selectedScrumRole, setSelectedScrumRole] = useState<string>('');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const projectParam = searchParams.get('project');
  
  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const { bootstrap, error: authError, login, logout, status, user } = useAuthStore();
  const { error, loadBoard, loading, projects, selectProject, selectedProjectId: boardSelectedProjectId, tasks, folders } = useBoardStore();
  const {
    assignProjectMembership,
    assignFolderMembership,
    createUser,
    updateUser,
    deleteUser,
    createUserPending,
    loadUsers,
    users,
    usersError,
    usersLoading,
    usersPending,
  } = useAdminStore();

  const currentProject = projects.find((project) => project.id === boardSelectedProjectId) ?? null;
  const projectAccessLabel = currentProject?.membershipRole ?? (user?.platformRole === 'ADMIN' ? 'ADMIN' : null);
  const isAdmin = user?.platformRole === 'ADMIN';
  const projectColumns = currentProject?.columns && currentProject.columns.length > 0
    ? currentProject.columns
    : [
        { id: 'todo', name: 'Por Hacer', emoji: '📋' },
        { id: 'in_progress', name: 'En Progreso', emoji: '⚡' },
        { id: 'test', name: 'Test', emoji: '🧪' },
        { id: 'done', name: 'Completado', emoji: '✅' },
      ];

  const completedTasks = tasks.filter((task) => {
    const lastCol = projectColumns[projectColumns.length - 1];
    return task.status === lastCol.name;
  }).length;
  const blockedTasks = tasks.filter((task) => task.isBlocked).length;
  const tasksByStatus = projectColumns.map((col) => ({
    status: col.name,
    emoji: col.emoji || null,
    tasks: tasks.filter((task) => task.status === col.name),
  }));

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (projectParam) {
        useBoardStore.setState({ selectedProjectId: projectParam });
      }
      void loadBoard();
    }
  }, [loadBoard, status]);

  useEffect(() => {
    if (status === 'authenticated' && boardSelectedProjectId && boardSelectedProjectId !== projectParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('project', boardSelectedProjectId);
          return next;
        },
        { replace: true }
      );
    }
  }, [status, boardSelectedProjectId, projectParam, setSearchParams]);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      void loadUsers();
    }
  }, [isAdmin, loadUsers, status]);

  useEffect(() => {
    if (!membershipProjectId && projects[0]) {
      setMembershipProjectId(projects[0].id);
    }
  }, [membershipProjectId, projects]);

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMagicLinkSentMessage(null);
    try {
      const res = await login(email);
      if (res && res.success) {
        setMagicLinkSentMessage(res.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminNotice(null);

    try {
      const createdUser = await createUser({
        email: newUserEmail,
        name: newUserName,
        platformRole: newUserRole,
      });

      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('MEMBER');
      setSelectedUserId(createdUser.id);
      setAdminNotice(`Usuario ${createdUser.email} creado.`);
    } catch {
      throw new Error('Error al crear usuario');
    }
  };

  const handleUpdateUser = async (userId: string, payload: any) => {
    setAdminNotice(null);
    try {
      await updateUser(userId, payload);
      setAdminNotice(`Usuario actualizado correctamente.`);
    } catch {
      throw new Error('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${name}"?`)) return;
    setAdminNotice(null);
    try {
      await deleteUser(userId);
      setAdminNotice(`Usuario ${name} eliminado.`);
    } catch {
      throw new Error('Error al eliminar usuario');
    }
  };

  const handleProjectChange = async (projectId: string) => {
    if (!projectId || projectId === boardSelectedProjectId) {
      return;
    }
    await selectProject(projectId);
  };

  if (status === 'loading' && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-slate-800 dark:text-slate-100">
        <Card className="w-full max-w-md p-4">
          <CardHeader className="text-center">
            <CardDescription>Holocron Security</CardDescription>
            <CardTitle className="text-xl">Restaurando sesión...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-650" />
          </CardContent>
        </Card>
      </main>
    );
  }

  const location = useLocation();

  if (location.pathname === '/login/callback') {
    return <LoginCallbackPage />;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-slate-800 dark:text-slate-100 holocron-grid">
        <Card className="w-full max-w-md shadow-2xl border-slate-200/60 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Database className="h-6 w-6" />
            </div>
            <CardDescription className="text-xs tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">HOLOCRON WORKSPACE</CardDescription>
            <CardTitle className="text-2xl font-black">Iniciar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-650 dark:text-slate-300">
                <span className="mb-1.5 block">Correo electrónico</span>
                <input className={fieldClassName} onChange={(event) => setEmail(event.target.value)} type="email" value={email} required />
              </label>
              {magicLinkSentMessage && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                  {magicLinkSentMessage}
                </div>
              )}
              {authError && !magicLinkSentMessage ? (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                  {authError}
                </div>
              ) : null}
              <Button className="w-full py-2.5 font-semibold text-white" variant="primary" disabled={status === 'loading'} type="submit">
                {status === 'loading' ? 'Enviando...' : 'Enviar enlace de acceso'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AppLayout
      user={user}
      isAdmin={isAdmin}
      theme={theme}
      setTheme={setTheme}
      logout={logout}
      pathname={useLocation().pathname}
      projects={projects}
      boardSelectedProjectId={boardSelectedProjectId}
      handleProjectChange={handleProjectChange}
      loading={loading}
      loadBoard={loadBoard}
    >
      {error ? (
        <Card className="mb-6 border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
          <CardHeader className="flex flex-row items-center gap-3">
            <Ban className="h-5 w-5" />
            <div>
              <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400">Error de conexión</CardTitle>
              <CardDescription className="normal-case tracking-normal text-rose-600 dark:text-rose-400">{error}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {!error && !loading && !projects.length ? (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-900/60 p-6 text-center">
            <Ban className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-650 mb-3" />
            <CardTitle className="text-lg">No hay proyectos asignados</CardTitle>
            <CardDescription className="normal-case tracking-normal max-w-md mx-auto mt-2">
              Tu cuenta está activa, pero actualmente no posees acceso a ningún proyecto. ¡Crea uno nuevo a continuación para comenzar!
            </CardDescription>
          </Card>

          <div className="max-w-md mx-auto">
            <CreateProjectCard />
          </div>
        </div>
      ) : null}

      <Routes>
        <Route path="/" element={<Navigate replace to="/overview" />} />
        <Route
          path="/overview"
          element={
            <OverviewPage
              blockedTasks={blockedTasks}
              completedTasks={completedTasks}
              currentProject={currentProject}
              onProjectChange={handleProjectChange}
              projectAccessLabel={projectAccessLabel}
              projects={projects}
              selectedProjectId={boardSelectedProjectId}
              tasksByStatus={tasksByStatus}
              tasks={tasks}
              userRole={user.platformRole}
            />
          }
        />
        <Route
          path="/board"
          element={
            <BoardPage
              currentProject={currentProject}
              onProjectChange={handleProjectChange}
              projects={projects}
              selectedProjectId={boardSelectedProjectId}
              tasksByStatus={tasksByStatus}
              userRole={user.platformRole}
            />
          }
        />
        <Route
          path="/sprints"
          element={
            <SprintsPage
              currentProject={currentProject}
              onProjectChange={handleProjectChange}
              projects={projects}
              selectedProjectId={boardSelectedProjectId}
              userRole={user.platformRole}
            />
          }
        />
        <Route
          path="/timeline"
          element={
            <TimelinePage />
          }
        />
        <Route path="/admin" element={<Navigate replace to="/admin/users" />} />
        <Route
          path="/admin/users"
          element={
            isAdmin ? (
              <AdminPage
                adminNotice={adminNotice}
                createUserPending={createUserPending}
                handleCreateUser={handleCreateUser}
                newUserEmail={newUserEmail}
                newUserName={newUserName}
                newUserRole={newUserRole}
                onNewUserEmailChange={setNewUserEmail}
                onNewUserNameChange={setNewUserName}
                onNewUserRoleChange={setNewUserRole}
                users={users}
                usersError={usersError}
                usersLoading={usersLoading}
                usersPending={usersPending}
                currentUserId={user?.id || ''}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onRefreshUsers={() => void loadUsers()}
              />
            ) : (
              <Navigate replace state={{ denied: 'admin' } satisfies RouteState} to="/overview" />
            )
          }
        />
        <Route
          path="/admin/projects"
          element={
            isAdmin ? (
              <ProjectsAdminPage />
            ) : (
              <Navigate replace state={{ denied: 'admin' } satisfies RouteState} to="/overview" />
            )
          }
        />
        <Route
          path="/admin/access"
          element={
            isAdmin ? (
              <AccessAdminPage />
            ) : (
              <Navigate replace state={{ denied: 'admin' } satisfies RouteState} to="/overview" />
            )
          }
        />
        <Route path="*" element={<Navigate replace to="/overview" />} />
      </Routes>
    </AppLayout>
  );
}

function LoginCallbackPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const loginWithMagicToken = useAuthStore((s) => s.loginWithMagicToken);
  const error = useAuthStore((s) => s.error);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      loginWithMagicToken(token)
        .then(() => {
          navigate('/overview');
        })
        .catch((err) => {
          console.error('[MAGIC LOGIN ERROR]:', err);
        });
    }
  }, [token, loginWithMagicToken, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg text-center">
        <h2 className="text-xl font-bold mb-4">Verificando enlace de acceso...</h2>
        {status === 'loading' && (
          <div className="flex justify-center items-center gap-2 text-indigo-650 dark:text-indigo-400 font-semibold text-sm">
            <span className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></span>
            Procesando inicio de sesión seguro...
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-250/40 dark:border-rose-800/40">
            {error}
            <div className="mt-4">
              <a href="/" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition">Volver al Login</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
