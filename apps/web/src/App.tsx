import { FormEvent, useEffect, useState } from 'react';
import type { PlatformRole, ProjectMembershipRole, TaskSummary } from '@holocron/contracts';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { cn } from './lib/cn';
import { useAuthStore } from './store/useAuthStore';
import { useAdminStore } from './store/useAdminStore';
import { useBoardStore } from './store/useBoardStore';

const statusOrder: TaskSummary['status'][] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

const statusTone: Record<TaskSummary['status'], string> = {
  TODO: 'text-slate-300',
  IN_PROGRESS: 'text-amber-300',
  BLOCKED: 'text-rose-300',
  DONE: 'text-emerald-300',
};

const statusLabel: Record<TaskSummary['status'], string> = {
  TODO: 'Queued',
  IN_PROGRESS: 'In Motion',
  BLOCKED: 'Blocked',
  DONE: 'Closed',
};

const priorityTone: Record<TaskSummary['priority'], string> = {
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-sky-950 text-sky-200',
  HIGH: 'bg-amber-950 text-amber-200',
  URGENT: 'bg-rose-950 text-rose-200',
};

const platformRoles: PlatformRole[] = ['ADMIN', 'MEMBER'];
const membershipRoles: ProjectMembershipRole[] = ['MANAGER', 'CONTRIBUTOR', 'VIEWER'];
const appViews = ['overview', 'board', 'admin'] as const;

type AppView = (typeof appViews)[number];

const fieldClassName =
  'w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/50';

function formatViewLabel(view: AppView) {
  return view === 'admin' ? 'Admin' : view === 'board' ? 'Board' : 'Overview';
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>('overview');
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
  const navItems = appViews.filter((view) => isAdmin || view !== 'admin');

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

  useEffect(() => {
    if (activeView === 'admin' && !isAdmin) {
      setActiveView('overview');
    }
  }, [activeView, isAdmin]);

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
      setAdminNotice(`User ${createdUser.email} created.`);
    } catch {
      return;
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

      setAdminNotice(`Assigned ${member.email} to project as ${member.role}.`);
    } catch {
      return;
    }
  };

  const tasksByStatus = statusOrder.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));

  const handleProjectChange = async (projectId: string) => {
    if (!projectId || projectId === boardSelectedProjectId) {
      return;
    }

    await selectProject(projectId);
  };

  const renderProjectSelect = () => (
    <label className="block text-sm text-slate-300">
      <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-500">Project</span>
      <select className={fieldClassName} onChange={(event) => void handleProjectChange(event.target.value)} value={boardSelectedProjectId ?? ''}>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );

  const renderOverview = () => (
    <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardDescription>Current focus</CardDescription>
          <CardTitle>{currentProject?.name ?? 'Awaiting project access'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            {currentProject?.description ?? 'Select a project to review the current workstream and team access.'}
          </p>
          {projects.length ? renderProjectSelect() : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Status" value={currentProject?.status ?? '...'} />
            <MetricCard label="Access role" value={projectAccessLabel ?? 'No access'} />
            <MetricCard label="Projects" value={String(projects.length)} />
            <MetricCard label="Tasks" value={String(currentProject?.taskCount ?? 0)} />
            <MetricCard label="Completed" value={String(completedTasks)} />
            <MetricCard label="Blocked" value={String(blockedTasks)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>At a glance</CardDescription>
          <CardTitle>Workstream summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasksByStatus.map((column) => (
            <div key={column.status} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className={cn('text-xs font-semibold uppercase tracking-[0.25em]', statusTone[column.status])}>{statusLabel[column.status]}</p>
                <span className="text-sm text-slate-400">{column.tasks.length}</span>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-6 text-slate-400">
            The dashboard is now intentionally quiet: summary here, execution in Board, administration in Admin.
          </div>
        </CardContent>
      </Card>
    </section>
  );

  const renderBoard = () => (
    <section className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <CardDescription>Project board</CardDescription>
            <CardTitle>{currentProject?.name ?? 'Mission queue'}</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-72">
            {projects.length ? renderProjectSelect() : null}
            <p className="text-sm text-slate-400">Tasks are grouped by status for the selected project only.</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {tasksByStatus.map((column) => (
              <section key={column.status} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className={cn('text-sm font-semibold uppercase tracking-[0.25em]', statusTone[column.status])}>{statusLabel[column.status]}</h2>
                  <span className="text-xs text-slate-500">{column.tasks.length}</span>
                </div>

                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <article key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-slate-950/20">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-base font-medium text-slate-100">{task.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityTone[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-400">{task.description ?? 'No description logged yet.'}</p>
                    </article>
                  ))}

                  {!column.tasks.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">No tasks in this lane.</div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );

  const renderAdmin = () => {
    if (!isAdmin) {
      return null;
    }

    return (
      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardDescription>Admin users</CardDescription>
            <CardTitle>User directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-300">All platform users visible to admins.</p>
              <Button disabled={usersLoading} onClick={() => void loadUsers()} type="button">
                {usersLoading ? 'Refreshing...' : 'Refresh users'}
              </Button>
            </div>

            {usersError ? <p className="text-sm text-rose-300">{usersError}</p> : null}
            {adminNotice ? <p className="text-sm text-emerald-300">{adminNotice}</p> : null}

            <div className="space-y-3">
              {users.map((member) => (
                <article key={member.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-100">{member.name}</p>
                      <p className="text-sm text-slate-400">{member.email}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                      {member.platformRole}
                    </span>
                  </div>
                </article>
              ))}

              {!usersLoading && !users.length ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">No users returned yet.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Admin create</CardDescription>
            <CardTitle>Create user</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateUser}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Name</span>
                <input className={fieldClassName} onChange={(event) => setNewUserName(event.target.value)} required type="text" value={newUserName} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Email</span>
                <input className={fieldClassName} onChange={(event) => setNewUserEmail(event.target.value)} required type="email" value={newUserEmail} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Password</span>
                <input className={fieldClassName} minLength={8} onChange={(event) => setNewUserPassword(event.target.value)} required type="password" value={newUserPassword} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Platform role</span>
                <select className={fieldClassName} onChange={(event) => setNewUserRole(event.target.value as PlatformRole)} value={newUserRole}>
                  {platformRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <Button className="w-full" disabled={createUserPending} type="submit">
                {createUserPending ? 'Creating...' : 'Create user'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Admin access</CardDescription>
            <CardTitle>Assign membership</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleAssignMembership}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">User</span>
                <select
                  className={fieldClassName}
                  disabled={!users.length || usersPending}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  required
                  value={selectedUserId}
                >
                  <option value="">Select a user</option>
                  {users.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Project</span>
                <select
                  className={fieldClassName}
                  disabled={!projects.length || usersPending}
                  onChange={(event) => setMembershipProjectId(event.target.value)}
                  required
                  value={membershipProjectId}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Project role</span>
                <select
                  className={fieldClassName}
                  disabled={usersPending}
                  onChange={(event) => setSelectedMembershipRole(event.target.value as ProjectMembershipRole)}
                  value={selectedMembershipRole}
                >
                  {membershipRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <Button className="w-full" disabled={!membershipProjectId || !selectedUserId || usersPending} type="submit">
                {usersPending ? 'Assigning...' : 'Assign to project'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    );
  };

  if (status === 'loading' && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardDescription>Holocron authentication</CardDescription>
            <CardTitle>Restoring session</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#020617_0%,_#020617_45%,_#0f172a_100%)] px-4 text-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardDescription>Holocron authentication</CardDescription>
            <CardTitle>Log in to command board</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Email</span>
                <input
                  className={fieldClassName}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Password</span>
                <input
                  className={fieldClassName}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>
              {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}
              <Button className="w-full" disabled={status === 'loading'} type="submit">
                {status === 'loading' ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="holocron-grid min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#020617_45%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Holocron</p>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Operations workspace</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Cleaner separation between project overview, task board, and platform administration.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:items-end">
              <div className="text-sm text-slate-300">
                <p className="font-medium text-slate-100">{user.name}</p>
                <p>{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button disabled={loading} onClick={() => void loadBoard()}>
                  {loading ? 'Syncing...' : 'Refresh data'}
                </Button>
                <Button onClick={() => void logout()} type="button">
                  Log out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-slate-800 bg-slate-950/70 p-2" aria-label="Primary">
          {navItems.map((view) => {
            const isActive = activeView === view;

            return (
              <button
                key={view}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100',
                )}
                onClick={() => setActiveView(view)}
                type="button"
              >
                {formatViewLabel(view)}
              </button>
            );
          })}
        </nav>

        {error ? (
          <Card className="mb-6 border-rose-500/30 bg-rose-950/30">
            <CardHeader>
              <CardTitle>Signal lost</CardTitle>
              <CardDescription className="normal-case tracking-normal text-rose-100">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!error && !loading && !projects.length ? (
          <Card className="mb-6 border-slate-800 bg-slate-950/70">
            <CardHeader>
              <CardTitle>No assigned projects</CardTitle>
              <CardDescription className="normal-case tracking-normal text-slate-300">
                Your account is active, but it does not currently have access to any project.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="pb-8">
          {activeView === 'overview' ? renderOverview() : null}
          {activeView === 'board' ? renderBoard() : null}
          {activeView === 'admin' ? renderAdmin() : null}
        </section>
      </div>
    </main>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-medium text-slate-100">{value}</p>
    </div>
  );
}
