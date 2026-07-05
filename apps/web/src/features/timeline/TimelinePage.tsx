import { useState, useMemo } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import {
  Calendar as CalendarIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Sliders,
} from 'lucide-react';

export function TimelinePage() {
  const { tasks, projects, selectedProjectId, updateTask } = useBoardStore();
  const [activeTab, setActiveTab] = useState<'cascade' | 'calendar'>('cascade');

  // Find current project
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Tasks from the selected project (tasks list in store is already scoped to the project)
  const projectTasks = tasks;

  // State for Calendar Month View
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Generate days for Calendar Month View
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust startDayOfWeek to start on Monday (1) instead of Sunday (0)
    // index: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: Array<{ date: Date; isCurrentMonth: boolean; key: string }> = [];

    // Previous month filler days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = adjustedStart - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isCurrentMonth: false, key: `prev-${d.getTime()}` });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, key: `curr-${d.getTime()}` });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, key: `next-${d.getTime()}` });
    }

    return days;
  }, [currentDate]);

  // Gantt Chart timeframe calculation (minimum and maximum dates of tasks in project)
  const ganttTimeframe = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14); // default 2 weeks window

    const validDates = projectTasks
      .flatMap((t) => [t.startDate ? new Date(t.startDate) : null, t.endDate ? new Date(t.endDate) : null])
      .filter((d): d is Date => d !== null);

    if (validDates.length > 0) {
      minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
      maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));
      
      // Pad by 3 days on both sides for visual comfort
      minDate.setDate(minDate.getDate() - 3);
      maxDate.setDate(maxDate.getDate() + 3);
    } else {
      // If no task dates, set min to 3 days ago, max to 11 days from now
      minDate.setDate(minDate.getDate() - 3);
    }

    // Generate list of days in range
    const daysList: Date[] = [];
    const temp = new Date(minDate);
    while (temp <= maxDate) {
      daysList.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    return { minDate, maxDate, daysList };
  }, [projectTasks]);

  // Helper to handle date changes
  const handleDateChange = async (taskId: string, field: 'startDate' | 'endDate', val: string) => {
    const task = projectTasks.find((t) => t.id === taskId);
    if (!task) return;

    const startDate = field === 'startDate' ? (val ? new Date(val).toISOString() : null) : task.startDate;
    const endDate = field === 'endDate' ? (val ? new Date(val).toISOString() : null) : task.endDate;

    await updateTask(
      taskId,
      undefined, // title
      undefined, // description
      undefined, // status
      undefined, // priority
      undefined, // isBlocked
      undefined, // blockedReason
      undefined, // ownerIds
      undefined, // assigneeIds
      undefined, // sprintId
      startDate,
      endDate
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="text-center max-w-sm">
          <Layers className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-lg font-bold">Selecciona un proyecto</h2>
          <p className="text-sm text-slate-400 mt-2">Es necesario seleccionar o crear un proyecto para visualizar su cronograma de tareas.</p>
        </div>
      </div>
    );
  }

  // Get status color badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">Done</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">In Progress</span>;
      case 'BLOCKED':
        return <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">Blocked</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 dark:bg-slate-950/40 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/80">Todo</span>;
    }
  };

  // Get status background for waterfall bar
  const getBarColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-emerald-500/80 dark:bg-emerald-600/70 border-emerald-600/30';
      case 'IN_PROGRESS':
        return 'bg-indigo-500/80 dark:bg-indigo-650/70 border-indigo-600/30';
      case 'BLOCKED':
        return 'bg-rose-500/80 dark:bg-rose-600/70 border-rose-600/30';
      default:
        return 'bg-slate-400/80 dark:bg-slate-700/70 border-slate-500/30';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
            Cronograma del Proyecto: {currentProject.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visualiza plazos de entrega, dependencias en cascada y planificación calendarizada.</p>
        </div>

        {/* TAB SELECTOR */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm">
          <button
            onClick={() => setActiveTab('cascade')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition duration-200",
              activeTab === 'cascade'
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Diagrama de Cascada (Gantt)
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition duration-200",
              activeTab === 'calendar'
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Calendario Mensual
          </button>
        </div>
      </div>

      {/* CASCADE (GANTT) VIEW */}
      {activeTab === 'cascade' && (
        <Card className="shadow-xl border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 p-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-650" />
              Línea Temporal de Entregables
            </CardTitle>
            <CardDescription className="text-xs">Usa los selectores de fecha de la tabla para posicionar las tareas en la cascada.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[950px] flex divide-x divide-slate-150 dark:divide-slate-800/60">
              
              {/* TABLE LIST SECTION */}
              <div className="w-[450px] shrink-0 divide-y divide-slate-100 dark:divide-slate-800/40">
                {/* Header row */}
                <div className="flex items-center px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <div className="flex-1">Tarea</div>
                  <div className="w-24 text-center">F. Inicio</div>
                  <div className="w-24 text-center">F. Fin</div>
                  <div className="w-20 text-center">Estado</div>
                </div>

                {projectTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No hay tareas registradas en este proyecto.
                  </div>
                ) : (
                  projectTasks.map((t) => (
                    <div key={t.id} className="flex items-center px-4 py-3 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Task title */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{t.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.description || 'Sin descripción'}</p>
                      </div>

                      {/* Start Date input */}
                      <div className="w-24 px-1">
                        <input
                          type="date"
                          value={t.startDate ? t.startDate.split('T')[0] : ''}
                          onChange={(e) => handleDateChange(t.id, 'startDate', e.target.value)}
                          className="w-full text-[11px] px-1.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/60 dark:bg-slate-955 font-medium focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition"
                        />
                      </div>

                      {/* End Date input */}
                      <div className="w-24 px-1">
                        <input
                          type="date"
                          value={t.endDate ? t.endDate.split('T')[0] : ''}
                          onChange={(e) => handleDateChange(t.id, 'endDate', e.target.value)}
                          className="w-full text-[11px] px-1.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/60 dark:bg-slate-955 font-medium focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition"
                        />
                      </div>

                      {/* Status */}
                      <div className="w-20 text-right">
                        {getStatusBadge(t.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* TIMELINE VISUAL SECTION */}
              <div className="flex-1 overflow-x-auto relative">
                {/* Visual Header Timeline Days */}
                <div className="flex divide-x divide-slate-100 dark:divide-slate-800/30 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 select-none">
                  {ganttTimeframe.daysList.map((day, idx) => {
                    const isToday = new Date().toDateString() === day.toDateString();
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "w-9 h-10 flex flex-col items-center justify-center shrink-0 text-[10px] font-bold leading-none border-r border-slate-150 dark:border-slate-800/30",
                          isToday ? "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-black" : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        <span>{day.toLocaleDateString('es-ES', { weekday: 'narrow' })}</span>
                        <span className="text-[11px] mt-1">{day.getDate()}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Rows mapped to tasks */}
                <div className="relative divide-y divide-slate-100 dark:divide-slate-800/40">
                  {projectTasks.map((t) => {
                    // Calculate bar position & width
                    let barLeft = 0;
                    let barWidth = 0;

                    if (t.startDate && t.endDate) {
                      const sDate = new Date(t.startDate);
                      sDate.setHours(0,0,0,0);
                      const eDate = new Date(t.endDate);
                      eDate.setHours(23,59,59,999);

                      const timeframeStart = new Date(ganttTimeframe.minDate);
                      timeframeStart.setHours(0,0,0,0);

                      // Calculate differences in days
                      const diffToStart = Math.max(0, Math.floor((sDate.getTime() - timeframeStart.getTime()) / (1000 * 60 * 60 * 24)));
                      const diffToEnd = Math.floor((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                      barLeft = diffToStart * 36; // 36px per column (w-9)
                      barWidth = Math.max(20, diffToEnd * 36); // minimum 20px
                    }

                    return (
                      <div key={t.id} className="h-[46px] relative flex items-center group bg-white dark:bg-slate-900/20 hover:bg-slate-50/10 dark:hover:bg-slate-800/10 transition-colors">
                        
                        {/* Vertical grid lines */}
                        <div className="absolute inset-0 flex divide-x divide-slate-150/40 dark:divide-slate-800/10 pointer-events-none select-none">
                          {ganttTimeframe.daysList.map((_, i) => (
                            <div key={i} className="w-9 h-full shrink-0" />
                          ))}
                        </div>

                        {/* Visual Task Bar */}
                        {t.startDate && t.endDate ? (
                          <div
                            style={{ left: `${barLeft}px`, width: `${barWidth}px` }}
                            className={cn(
                              "absolute h-6.5 rounded-full border shadow-sm px-3 flex items-center transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-grab active:cursor-grabbing",
                              getBarColor(t.status)
                            )}
                            title={`${t.title}: ${new Date(t.startDate).toLocaleDateString()} - ${new Date(t.endDate).toLocaleDateString()}`}
                          >
                            <span className="text-[10px] font-bold text-white truncate drop-shadow-sm select-none">{t.title}</span>
                          </div>
                        ) : (
                          <div className="absolute left-4 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-200/40 dark:border-slate-800/50">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Sin fechas configuradas
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <Card className="shadow-xl border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 p-4 flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-indigo-650" />
                Calendario del Proyecto
              </CardTitle>
              <CardDescription className="text-xs">Consulta las tareas calendarizadas en una cuadrícula mensual interactiva.</CardDescription>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2.5">
              <Button onClick={handlePrevMonth} variant="outline" size="sm" className="h-8.5 w-8.5 p-0 rounded-xl">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider min-w-32 text-center">
                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <Button onClick={handleNextMonth} variant="outline" size="sm" className="h-8.5 w-8.5 p-0 rounded-xl">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Week days labels */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/30 bg-slate-50/40 dark:bg-slate-900/30 text-center py-2.5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>

            {/* Monthly grid */}
            <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100 dark:divide-slate-800/40 border-b border-slate-100 dark:border-slate-800/40">
              {calendarDays.map(({ date, isCurrentMonth, key }) => {
                const isToday = new Date().toDateString() === date.toDateString();

                // Get tasks starting or running on this day
                const dayTasks = projectTasks.filter((t) => {
                  if (!t.startDate || !t.endDate) return false;
                  const s = new Date(t.startDate);
                  s.setHours(0,0,0,0);
                  const e = new Date(t.endDate);
                  e.setHours(23,59,59,999);
                  const curr = new Date(date);
                  curr.setHours(12,0,0,0);

                  return curr >= s && curr <= e;
                });

                return (
                  <div 
                    key={key} 
                    className={cn(
                      "min-h-24 p-2 transition flex flex-col justify-between hover:bg-slate-50/20 dark:hover:bg-slate-800/5",
                      isCurrentMonth ? "bg-white dark:bg-slate-900/10" : "bg-slate-50/30 dark:bg-slate-950/20 text-slate-400 dark:text-slate-655"
                    )}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-center mb-1">
                      <span 
                        className={cn(
                          "text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full leading-none",
                          isToday && "bg-indigo-600 text-white shadow-sm font-black",
                          !isToday && isCurrentMonth && "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Day task list */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-20 scrollbar-none">
                      {dayTasks.map((t) => (
                        <div 
                          key={t.id} 
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold truncate leading-tight border transition hover:opacity-90 select-none",
                            t.status === 'DONE' && "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
                            t.status === 'IN_PROGRESS' && "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
                            t.status === 'BLOCKED' && "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
                            t.status === 'TODO' && "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-750"
                          )}
                          title={`${t.title} [${t.status}]`}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
