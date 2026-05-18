import { FormEvent, useEffect, useState } from 'react';
import type { TaskSummary } from '@holocron/contracts';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { useAuthStore } from './store/useAuthStore';
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

export function App() {
  const [email, setEmail] = useState('keeper@holocron.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const { bootstrap, error: authError, login, logout, status, user } = useAuthStore();
  const { error, loadBoard, loading, projects, selectedProjectId, tasks } = useBoardStore();
  const currentProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const projectAccessLabel = currentProject?.membershipRole ?? (user?.platformRole === 'ADMIN' ? 'ADMIN' : null);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadBoard();
    }
  }, [loadBoard, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login(email, password);
  };

  const tasksByStatus = statusOrder.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));

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
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#111827_100%)] px-4 text-slate-100">
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
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-0"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Password</span>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-0"
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
    <main className="holocron-grid min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-sky-500/20 bg-slate-950/70 p-6 shadow-2xl shadow-sky-950/20 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Holocron Command Board</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Dark, fast, and focused project telemetry.</h1>
              <p className="text-sm leading-6 text-slate-300 sm:text-base">
                A restrained operations view with one seeded mission, real API data, and zero ceremony.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="text-sm text-slate-300">
                <p className="font-medium text-slate-100">{user.name}</p>
                <p>{user.email}</p>
              </div>
              <div className="flex gap-3">
                <Button disabled={loading} onClick={() => void loadBoard()}>
                  {loading ? 'Syncing...' : 'Refresh board'}
                </Button>
                <Button onClick={() => void logout()} type="button">
                  Log out
                </Button>
              </div>
            </div>
          </div>
        </header>

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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <Card>
            <CardHeader>
              <CardDescription>Primary project</CardDescription>
              <CardTitle>{currentProject?.name ?? 'Awaiting uplink'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-300">
                {currentProject?.description ?? 'The board will populate once the API responds with a project.'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Status</p>
                  <p className="mt-2 text-lg font-medium text-sky-100">{currentProject?.status ?? '...'}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Tasks</p>
                  <p className="mt-2 text-lg font-medium text-sky-100">{currentProject?.taskCount ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Complete</p>
                  <p className="mt-2 text-lg font-medium text-sky-100">{currentProject?.completedTaskCount ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Projects</p>
                  <p className="mt-2 text-lg font-medium text-sky-100">{projects.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Access role</p>
                  <p className="mt-2 text-lg font-medium text-sky-100">{projectAccessLabel ?? 'No access'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Task stream</CardDescription>
              <CardTitle>Mission queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-2">
                {tasksByStatus.map((column) => (
                  <section key={column.status} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className={`text-sm font-semibold uppercase tracking-[0.25em] ${statusTone[column.status]}`}>
                        {statusLabel[column.status]}
                      </h2>
                      <span className="text-xs text-slate-500">{column.tasks.length}</span>
                    </div>

                    <div className="space-y-3">
                      {column.tasks.map((task) => (
                        <article key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-slate-950/30">
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
      </div>
    </main>
  );
}
