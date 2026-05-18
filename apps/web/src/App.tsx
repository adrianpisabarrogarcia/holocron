import { useEffect } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { useBoardStore } from './store/useBoardStore';

const statusTone: Record<string, string> = {
  TODO: 'text-slate-300',
  IN_PROGRESS: 'text-amber-300',
  BLOCKED: 'text-rose-300',
  DONE: 'text-emerald-300',
};

const priorityTone: Record<string, string> = {
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-sky-950 text-sky-200',
  HIGH: 'bg-amber-950 text-amber-200',
  URGENT: 'bg-rose-950 text-rose-200',
};

export function App() {
  const { currentProject, error, isLoading, loadBoard, tasks } = useBoardStore();

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#111827_100%)] text-slate-100">
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
            <Button disabled={isLoading} onClick={() => void loadBoard()}>
              {isLoading ? 'Syncing...' : 'Refresh board'}
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="mb-6 border-rose-500/30 bg-rose-950/30">
            <CardHeader>
              <CardTitle>Signal lost</CardTitle>
              <CardDescription>{error}</CardDescription>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Task stream</CardDescription>
              <CardTitle>Mission queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-slate-950/30"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="text-base font-medium text-slate-100">{task.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityTone[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="mb-4 text-sm leading-6 text-slate-400">{task.description ?? 'No description logged yet.'}</p>
                    <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${statusTone[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </p>
                  </article>
                ))}
                {!tasks.length && !isLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                    No tasks returned from the API.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
