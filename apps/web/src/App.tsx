import { FormEvent, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import { AdminPage } from './features/admin/AdminPage';
import { ProjectsAdminPage } from './features/admin/ProjectsAdminPage';
import { CreateProjectCard } from './features/overview/CreateProjectCard';

type RouteState = {
  denied?: 'admin';
};

export function App() {
  const [email, setEmail] = useState('keeper@holocron.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<PlatformRole>('MEMBER');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [membershipProjectId, setMembershipProjectId] = useState('');
  const [selectedMembershipRole, setSelectedMembershipRole] = useState<ProjectMembershipRole>('CONTRIBUTOR');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  
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
  const { error, loadBoard, loading, projects, selectProject, selectedProjectId: boardSelectedProjectId, tasks } = useBoardStore();
  const {
    assignProjectMembership,
    createUser,
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
  const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
  const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED').length;
  const tasksByStatus = statusOrder.map((taskStatus) => ({
    status: taskStatus,
    tasks: tasks.filter((task) => task.status === taskStatus),
  }));

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadBoard();
    }
  }, [loadBoard, status]);

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
    await login(email, password);
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminNotice(null);

    try {
      const createdUser = await createUser({
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword,
        platformRole: newUserRole,
      });

      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole('MEMBER');
      setSelectedUserId(createdUser.id);
      setAdminNotice(`Usuario ${createdUser.email} creado.`);
    } catch {
      throw new Error('Error al crear usuario');
    }
  };

  const handleAssignMembership = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminNotice(null);

    try {
      const member = await assignProjectMembership({
        projectId: membershipProjectId,
        role: selectedMembershipRole,
        userId: selectedUserId,
      });

      setAdminNotice(`Asignado ${member.email} al proyecto como ${member.role}.`);
    } catch {
      throw new Error('Error al asignar miembro');
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
              <label className="block text-sm font-medium text-slate-650 dark:text-slate-300">
                <span className="mb-1.5 block">Contraseña</span>
                <input className={fieldClassName} onChange={(event) => setPassword(event.target.value)} type="password" value={password} required />
              </label>
              {authError ? (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                  {authError}
                </div>
              ) : null}
              <Button className="w-full py-2.5 font-semibold text-white" variant="primary" disabled={status === 'loading'} type="submit">
                {status === 'loading' ? 'Accediendo...' : 'Entrar en el sistema'}
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
        <Route path="/admin" element={<Navigate replace to="/admin/users" />} />
        <Route
          path="/admin/users"
          element={
            isAdmin ? (
              <AdminPage
                adminNotice={adminNotice}
                createUserPending={createUserPending}
                handleAssignMembership={handleAssignMembership}
                handleCreateUser={handleCreateUser}
                membershipProjectId={membershipProjectId}
                newUserEmail={newUserEmail}
                newUserName={newUserName}
                newUserPassword={newUserPassword}
                newUserRole={newUserRole}
                onMembershipProjectIdChange={setMembershipProjectId}
                onNewUserEmailChange={setNewUserEmail}
                onNewUserNameChange={setNewUserName}
                onNewUserPasswordChange={setNewUserPassword}
                onNewUserRoleChange={setNewUserRole}
                onSelectedMembershipRoleChange={setSelectedMembershipRole}
                onSelectedUserIdChange={setSelectedUserId}
                projects={projects}
                selectedMembershipRole={selectedMembershipRole}
                selectedUserId={selectedUserId}
                users={users}
                usersError={usersError}
                usersLoading={usersLoading}
                usersPending={usersPending}
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
        <Route path="*" element={<Navigate replace to="/overview" />} />
      </Routes>
    </AppLayout>
  );
}
