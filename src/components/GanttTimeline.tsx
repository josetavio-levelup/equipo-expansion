import React, { useState, useMemo, useRef, useEffect } from "react";
import { type Task, type RouteCity, type TeamMember, type Priority, type Status, type Vacation, type TagType } from "../types";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Tag, User, Plus, X, AlertTriangle } from "lucide-react";

interface GanttTimelineProps {
  tasks: Task[];
  routeCities: RouteCity[];
  teamMembers: TeamMember[];
  vacations: Vacation[];
  tagsBank?: TagType[];
  onAddTask?: (task: Omit<Task, "id">) => Promise<{ success: boolean; message?: string }>;
  isDarkMode?: boolean;
  holidays?: Holiday[];
}

interface CalendarDate {
  id: string; // "2026-06-01"
  day: number;
  month: number; // 0-indexed: 5 = June, 6 = July...
  year: number;
  monthLabel: string;
  monthName: string;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export default function GanttTimeline({ 
  tasks, 
  routeCities, 
  teamMembers, 
  vacations, 
  tagsBank = [], 
  onAddTask,
  isDarkMode = true,
  holidays = []
}: GanttTimelineProps) {
  // View types: day, week, month
  type ViewMode = "day" | "week" | "month";
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  
  const [viewportStartDate, setViewportStartDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - (day === 0 ? 6 : day - 1);
    return new Date(today.getFullYear(), today.getMonth(), diff, 12, 0, 0);
  });

  const monthLabels = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  // New task form fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [routeId, setRouteId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [status, setStatus] = useState<Status>("PENDING");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const daysViewport = useMemo<CalendarDate[]>(() => {
    if (viewMode === "month") {
      // 5 months starting from June 2026
      const list: CalendarDate[] = [];
      const months = [5, 6, 7, 8, 9]; // June, July, August, September, October
      const mLabels = ["JUN", "JUL", "AGO", "SEP", "OCT"];
      const mNames = ["Junio", "Julio", "Agosto", "Septiembre", "Octubre"];

      months.forEach((m, idx) => {
        const totalDays = getDaysInMonth(2026, m);
        for (let d = 1; d <= totalDays; d++) {
          const mLabel = mLabels[idx];
          const mName = mNames[idx];
          const dateStr = `2026-${(m + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
          list.push({
            id: dateStr,
            day: d,
            month: m,
            year: 2026,
            monthLabel: mLabel,
            monthName: mName
          });
        }
      });
      return list;
    } else {
      const list: CalendarDate[] = [];
      const len = viewMode === "day" ? 1 : 14;
      for (let i = 0; i < len; i++) {
        const d = new Date(viewportStartDate);
        d.setDate(viewportStartDate.getDate() + i);
        const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        list.push({
          id: dateStr,
          day: d.getDate(),
          month: d.getMonth(),
          year: d.getFullYear(),
          monthLabel: monthLabels[d.getMonth()],
          monthName: monthNames[d.getMonth()]
        });
      }
      return list;
    }
  }, [viewMode, viewportStartDate]);

  const viewportSize = useMemo(() => {
    return daysViewport.length;
  }, [daysViewport]);

  // Scroll to current day automatically when component mounts or when viewMode changes
  useEffect(() => {
    if (scrollContainerRef.current && daysViewport.length > 0) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const totalWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;

        // Find today's date index in the viewport
        const today = new Date();
        const todayIndex = daysViewport.findIndex(d => d.year === today.getFullYear() && d.month === today.getMonth() && d.day === today.getDate());

        if (todayIndex !== -1) {
          const gridWidth = totalWidth - 220;
          const dayCellWidth = gridWidth / daysViewport.length;
          const targetX = 220 + (todayIndex * dayCellWidth) + (dayCellWidth / 2);
          const targetScroll = targetX - (clientWidth / 2);

          if (targetScroll > 0) {
            container.scrollTo({
              left: targetScroll,
              behavior: "smooth"
            });
          }
        }
      }, 150);
    }
  }, [viewMode, viewportStartDate, daysViewport]);

  const openCreateModal = () => {
    setTitle("");
    setRouteId(routeCities[0]?.id || "");
    setResponsibleId(teamMembers[0]?.id || "");
    setPriority("MEDIUM");
    setStatus("PENDING");
    
    // Default draft preview date is now empty by default so it's not a mandatory pre-filled field
    setDueDate("");
    setSelectedTags([]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handlePrevRange = () => {
    const step = viewMode === "day" ? 1 : 7;
    setViewportStartDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() - step);
      return nextDate;
    });
  };

  const handleNextRange = () => {
    const step = viewMode === "day" ? 1 : 7;
    setViewportStartDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() + step);
      return nextDate;
    });
  };

  // Helper names
  const getMemberName = (id: string) => teamMembers.find(m => m.id === id)?.name || id;
  const getPairShortNames = (assignedPair: string | string[]) => {
    if (!assignedPair) return "Sin asignar";
    const parts = Array.isArray(assignedPair)
      ? assignedPair
      : (assignedPair as string).split("-").filter(Boolean);
    if (parts.length === 0) return "Sin asignar";
    return parts.map(id => getMemberName(id).split(" ")[0]).join(" + ");
  };

  const isAssignedToMember = (task: Task, memberId: string) => {
    if (!task.assignedPair) return false;
    const parts = Array.isArray(task.assignedPair)
      ? task.assignedPair
      : (task.assignedPair as unknown as string).split("-").filter(Boolean);
    return parts.includes(memberId);
  };

  const getCityName = (id: string) => routeCities.find(c => c.id === id)?.name || "Sin Ciudad";

  const isWeekendDay = (cDate: CalendarDate) => {
    const date = new Date(cDate.year, cDate.month, cDate.day);
    const w = date.getDay();
    return w === 0 || w === 6;
  };

  const getWeekdayName = (cDate: CalendarDate, view: string) => {
    const date = new Date(cDate.year, cDate.month, cDate.day);
    const w = date.getDay();
    return ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"][w];
  };

  // Check if a task falls in a specific day and is assigned to the member
  const getTasksForDayAndMember = (memberId: string, cDate: CalendarDate) => {
    return tasks.filter(t => {
      if (!isAssignedToMember(t, memberId)) return false;
      const d = new Date(t.dueDate);
      return d.getMonth() === cDate.month && d.getFullYear() === cDate.year && d.getDate() === cDate.day;
    });
  };

  // Check if a member has approved time off / vacation on a specific day of the view
  const getVacationsForDayAndMember = (memberId: string, cDate: CalendarDate) => {
    const currentDate = new Date(cDate.year, cDate.month, cDate.day, 12, 0, 0);
    return vacations.filter(vac => {
      if (vac.userId !== memberId || vac.status !== "APPROVED") return false;
      const start = new Date(vac.startDate + "T00:00:00");
      const end = new Date(vac.endDate + "T23:59:59");
      return currentDate >= start && currentDate <= end;
    });
  };

  // Class helper for priority styling
  const getPriorityClasses = (prio: string) => {
    switch (prio) {
      case "CRITICAL":
        return isDarkMode
          ? "bg-red-500 border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"
          : "bg-red-600 border-red-500 text-white font-semibold";
      case "HIGH":
        return isDarkMode
          ? "bg-orange-500 border-orange-400 text-black shadow-[0_0_8px_rgba(249,115,22,0.3)]"
          : "bg-orange-400 border-orange-500 text-black font-semibold";
      case "MEDIUM":
        return isDarkMode
          ? "bg-cyan-500 border-cyan-400 text-black"
          : "bg-cyan-500 border-cyan-600 text-black font-semibold";
      default:
        return isDarkMode
          ? "bg-zinc-800 border-zinc-700 text-zinc-300"
          : "bg-zinc-100 border-zinc-300 text-zinc-800 font-medium";
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const pairString = responsibleId;
    const formattedDueDate = dueDate ? (dueDate.includes("T") ? dueDate : `${dueDate}T12:00:00`) : "";

    const taskPayload = {
      title,
      routeId,
      assignedPair: responsibleId ? [responsibleId] : [],
      priority,
      status,
      dueDate: formattedDueDate,
      tags: selectedTags,
      subtasks: [],
    };

    try {
      const result = await onAddTask(taskPayload);
      if (result.success) {
        setIsModalOpen(false);
      } else {
        setErrorMessage(result.message || "Error al registrar la tarea.");
      }
    } catch (err: any) {
      setErrorMessage("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className={`flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border rounded-xl p-4 ${
        isDarkMode 
          ? "bg-zinc-950/80 border-zinc-900" 
          : "bg-white border-zinc-200 shadow-sm"
      }`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${
            isDarkMode ? "text-white" : "text-zinc-800"
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 inline-block animate-pulse" />
            Calendario
          </h2>

        </div>

        {/* Viewport controls and Add button wrapper */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* View mode selector */}
          <div className={`flex border rounded-lg p-1 text-sm self-stretch sm:self-auto justify-between ${
            isDarkMode 
              ? "bg-zinc-900 border-zinc-800 text-white" 
              : "bg-slate-100 border-zinc-200 text-zinc-850"
          }`}>
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  if (mode === "day") {
                    setViewportStartDate(new Date());
                  } else if (mode === "week") {
                    const today = new Date();
                    const day = today.getDay();
                    const diff = today.getDate() - (day === 0 ? 6 : day - 1);
                    setViewportStartDate(new Date(today.getFullYear(), today.getMonth(), diff, 12, 0, 0));
                  } else if (mode === "month") {
                    setViewportStartDate(new Date(2026, 5, 1, 12, 0, 0));
                  }
                }}
                className={`px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === mode
                    ? "bg-cyan-500 text-black shadow-md font-extrabold"
                    : isDarkMode 
                      ? "text-zinc-400 hover:text-white" 
                      : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Todo"}
              </button>
            ))}
          </div>

          {/* Navigation viewport sliders */}
          {viewMode !== "month" && (
            <div className="flex items-center gap-3 font-mono text-sm w-full sm:w-auto justify-between sm:justify-start">
              <span className={isDarkMode ? "text-zinc-500" : "text-zinc-400"}>DÍAS:</span>
              <div className={`flex items-center border rounded-lg p-1 ${
                isDarkMode 
                  ? "bg-zinc-900 border-zinc-800 text-white" 
                  : "bg-slate-100 border-zinc-200 text-zinc-800"
              }`}>
                <button
                  onClick={handlePrevRange}
                  className={`p-1 disabled:opacity-30 cursor-pointer transition ${
                    isDarkMode ? "hover:text-cyan-400 text-zinc-300" : "hover:text-cyan-600 text-zinc-600"
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 min-w-[124px] text-center uppercase font-bold text-sm text-cyan-400">
                  {viewMode === "day" 
                    ? `Día ${viewportStartDate.getDate()} de ${monthNames[viewportStartDate.getMonth()]}` 
                    : `Días ${viewportStartDate.getDate()} ${monthLabels[viewportStartDate.getMonth()]} al ${(() => {
                        const endD = new Date(viewportStartDate);
                        endD.setDate(viewportStartDate.getDate() + viewportSize - 1);
                        return `${endD.getDate()} ${monthLabels[endD.getMonth()]}`;
                      })()}`}
                </span>
                <button
                  onClick={handleNextRange}
                  className={`p-1 disabled:opacity-30 cursor-pointer transition ${
                    isDarkMode ? "hover:text-cyan-400 text-zinc-300" : "hover:text-cyan-600 text-zinc-600"
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {viewMode === "month" && (
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold font-mono uppercase text-center sm:text-left border ${
              isDarkMode 
                ? "bg-zinc-900 border-zinc-800 text-zinc-400" 
                : "bg-slate-100 border-zinc-200 text-zinc-650"
            }`}>
              Junio - Octubre 2026 (5 meses)
            </div>
          )}

          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black px-4 py-2 rounded-lg text-sm font-bold transition shadow-[0_4px_15px_rgba(6,182,212,0.15)] cursor-pointer"
          >
            <Plus size={14} />
            Nueva tarea
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className={`border rounded-xl p-4 overflow-x-auto ${
          isDarkMode 
            ? "bg-zinc-950/60 border-zinc-900" 
            : "bg-white border-zinc-200 shadow-sm"
        }`}
      >
        <div className={`space-y-2 ${
          viewMode === "day" ? "min-w-[550px]" : viewMode === "week" ? "min-w-[990px]" : "min-w-[7200px]"
        }`}>
             {/* Calendar header row */}
          <div className={`flex items-center text-center font-mono text-sm font-bold border-b pb-2 ${
            isDarkMode ? "text-zinc-500 border-zinc-900" : "text-zinc-600 border-zinc-200"
          }`}>
            
            <div className={`w-[220px] shrink-0 text-left pl-2 sticky left-0 z-10 ${isDarkMode ? "text-zinc-500 bg-zinc-950" : "text-zinc-850 bg-white"}`}>
              EQUIPO
            </div>

            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${viewportSize}, minmax(0, 1fr))` }}>
              {daysViewport.map(day => {
                const isWeekend = isWeekendDay(day);
                const wName = getWeekdayName(day, viewMode);
                const today = new Date();
                const isToday = day.year === today.getFullYear() && day.month === today.getMonth() && day.day === today.getDate();
                const holiday = holidays.find(h => h.date === day.id);
                
                let dayBgClass = "";
                if (holiday) {
                  dayBgClass = isDarkMode ? "bg-purple-950/40 text-purple-400 border border-purple-850" : "bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-sm";
                } else if (isToday) {
                  dayBgClass = isDarkMode ? "bg-cyan-500/10 text-[#00F3FF] border border-cyan-500/30 font-extrabold" : "bg-cyan-100 text-cyan-800 border border-cyan-400 font-extrabold shadow-sm";
                } else if (isWeekend) {
                  dayBgClass = isDarkMode ? "bg-zinc-900/60 text-zinc-500 border border-zinc-850" : "bg-slate-200/90 text-zinc-600 border border-slate-300";
                } else {
                  dayBgClass = isDarkMode ? "bg-zinc-900/15 text-zinc-400 border border-transparent" : "bg-slate-50 text-zinc-700 border border-transparent";
                }

                return (
                  <div 
                    key={day.id} 
                    className={`py-1 px-1 rounded flex flex-col items-center justify-center transition-all ${dayBgClass}`}
                    title={holiday ? `Día Festivo: ${holiday.name}` : undefined}
                  >
                    <span className={`text-sm font-mono leading-none tracking-wider font-extrabold mb-0.5 ${
                      holiday ? "text-purple-400" : isToday ? "text-[#00F3FF]" : isWeekend ? (isDarkMode ? "text-red-400" : "text-red-700") : (isDarkMode ? "text-zinc-500" : "text-zinc-500")
                    }`}>{wName}</span>
                    <span className={`font-bold text-sm leading-none ${holiday ? "text-purple-300" : isToday ? "text-[#00F3FF]" : isDarkMode ? "text-zinc-200" : "text-zinc-900"}`}>{day.day}</span>
                    <span className={`text-sm font-mono opacity-60 leading-none mt-0.5 ${holiday ? "text-purple-500" : isToday ? "text-[#00F3FF]" : isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>{day.monthLabel}</span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Table rows per team member */}
          {teamMembers.length === 0 ? (
            <div className={`text-center p-8 border border-dashed rounded-lg text-sm font-mono ${
              isDarkMode ? "border-zinc-800 text-zinc-500" : "border-zinc-300 text-zinc-500"
            }`}>
              NO SE HAN REGISTRADO INTEGRANTES EN EL EQUIPO. VE A LA PESTAÑA DE CONFIGURACIÓN.
            </div>
          ) : (
            teamMembers.map(member => {
              return (
                <div 
                  key={member.id} 
                  className={`flex items-center py-2.5 border-b rounded-lg transition-colors ${
                    isDarkMode 
                      ? "border-zinc-900/40 hover:bg-zinc-900/20" 
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  {/* Team member name */}
                  <div className={`w-[220px] shrink-0 flex items-center gap-2 pl-2 sticky left-0 z-10 ${
                    isDarkMode ? "bg-zinc-950" : "bg-white"
                  }`}>
                    <User size={14} className="text-[#00F3FF] shrink-0" />
                    <span className={`text-sm font-semibold block truncate ${
                      isDarkMode ? "text-zinc-200" : "text-black font-bold"
                    }`}>
                      {member.name}
                    </span>
                  </div>

                  {/* Days schedule grid */}
                  <div className="flex-1 grid gap-1 min-h-[56px] py-1" style={{ gridTemplateColumns: `repeat(${viewportSize}, minmax(0, 1fr))` }}>
                    {daysViewport.map(day => {
                      const dayTasks = getTasksForDayAndMember(member.id, day);
                      const dayVacations = getVacationsForDayAndMember(member.id, day);
                      const holiday = holidays.find(h => h.date === day.id);
                      const isWeekend = isWeekendDay(day);
                      
                      let cellClass = "";
                      if (isDarkMode) {
                        if (holiday) {
                          cellClass = "bg-purple-950/20 border border-purple-900/40 hover:bg-purple-950/40";
                        } else {
                          cellClass = isWeekend
                            ? "bg-zinc-950/90 border border-zinc-900 hover:bg-zinc-950 shadow-inner"
                            : "bg-zinc-900/10 border border-zinc-900/30 hover:bg-zinc-900/30";
                        }
                      } else {
                        if (holiday) {
                          cellClass = "bg-purple-50 border border-purple-200 hover:bg-purple-100/70 shadow-inner";
                        } else {
                          cellClass = isWeekend
                            ? "bg-slate-200/60 border border-slate-300 hover:bg-slate-200 shadow-inner"
                            : "bg-slate-50 border border-slate-200/85 hover:bg-slate-100";
                        }
                      }

                      return (
                        <div 
                          key={day.id} 
                          className={`relative rounded p-1 flex flex-col gap-1 items-stretch justify-start group min-h-[48px] transition ${cellClass}`}
                          title={holiday ? `Día Festivo: ${holiday.name}` : undefined}
                        >
                          {holiday && dayTasks.length === 0 && dayVacations.length === 0 && (
                            <span className="text-[10px] font-bold font-mono uppercase text-purple-400 text-center mt-2">
                              FESTIVO
                            </span>
                          )}
                          {/* Rendering day's tasks */}
                          {dayTasks.map(task => (
                            <div 
                              key={task.id}
                              title={task.title}
                              className={`rounded border px-2 py-1.5 flex flex-col justify-center overflow-hidden cursor-pointer select-none transition ${getPriorityClasses(task.priority)}`}
                            >
                              <span className="text-sm font-bold uppercase tracking-tight truncate leading-tight">
                                {task.title}
                              </span>

                              {/* HOVER DETAILS BOX */}
                              <div className="hidden group-hover:block absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-72 bg-zinc-950 border border-zinc-900 rounded-lg p-3.5 z-30 shadow-2xl text-left font-sans text-zinc-200">
                                <span className="block text-sm font-bold text-zinc-100 mb-1">{task.title}</span>
                                <div className="space-y-1 text-sm font-mono text-zinc-400">
                                  <div className="flex gap-1.5 items-center">
                                    <User size={14} className="text-[#00F3FF]" />
                                    <span>Responsables: {getPairShortNames(task.assignedPair)}</span>
                                  </div>
                                  <div className="flex gap-1.5 items-center">
                                    <Calendar size={14} />
                                    <span>Fecha límite: {new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-wrap mt-2">
                                  {task.tags.map((tag, i) => {
                                    const tagDetail = tagsBank?.find(t => t.name.toUpperCase() === tag.toUpperCase());
                                    const colColor = tagDetail?.color || "#64748b";
                                    return (
                                      <span 
                                        key={i} 
                                        className="text-sm px-2 py-0.5 rounded border font-semibold select-none"
                                        style={{
                                          backgroundColor: colColor + "15",
                                          borderColor: colColor + "40",
                                          color: colColor
                                        }}
                                      >
                                        #{tag}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Rendering day's approved vacations / courses / others */}
                          {dayVacations.map(vac => {
                            const emoji = vac.type === "curso" ? "📚" : vac.type === "otro" ? "📌" : "🌴";
                            const typeLabel = (vac.type || "vacaciones").toUpperCase();
                            const isCurso = vac.type === "curso";
                            const isOtro = vac.type === "otro";

                            let cardClasses = "";
                            let textClasses = "";
                            let commentClasses = "";

                            if (isCurso) {
                              cardClasses = isDarkMode
                                ? "border-blue-500/30 bg-blue-950/30 text-blue-300 hover:bg-blue-950/50"
                                : "border-blue-400/50 bg-blue-100/90 hover:bg-blue-100 text-blue-900 shadow-sm";
                              textClasses = isDarkMode ? "text-blue-300" : "text-blue-900 font-extrabold";
                              commentClasses = isDarkMode ? "text-zinc-400" : "text-blue-800 font-bold";
                            } else if (isOtro) {
                              cardClasses = isDarkMode
                                ? "border-orange-500/30 bg-orange-950/30 text-orange-300 hover:bg-orange-950/50"
                                : "border-orange-400/50 bg-orange-100/90 hover:bg-orange-100 text-orange-900 shadow-sm";
                              textClasses = isDarkMode ? "text-orange-300" : "text-orange-900 font-extrabold";
                              commentClasses = isDarkMode ? "text-zinc-400" : "text-orange-850 font-bold";
                            } else {
                              cardClasses = isDarkMode
                                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50"
                                : "border-emerald-400/50 bg-emerald-100/90 hover:bg-emerald-100 text-emerald-900 shadow-sm";
                              textClasses = isDarkMode ? "text-emerald-300" : "text-emerald-900 font-extrabold";
                              commentClasses = isDarkMode ? "text-zinc-400" : "text-emerald-805 font-bold";
                            }

                            return (
                              <div 
                                key={vac.id}
                                title={`${typeLabel}${vac.comment ? `: ${vac.comment}` : ""}`}
                                className={`rounded border px-2 py-1.5 flex flex-col justify-center overflow-hidden cursor-pointer select-none transition ${cardClasses}`}
                              >
                                <span className={`text-sm font-bold uppercase tracking-tight truncate leading-tight flex items-center gap-1 ${textClasses}`}>
                                  <span>{emoji}</span>
                                  <span>{typeLabel}</span>
                                </span>
                                {vac.comment && (
                                  <span className={`text-sm truncate leading-none mt-0.5 font-sans italic font-medium ${commentClasses}`}>
                                    {vac.comment}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })
          )}

        </div>
      </div>
      
      {/* Legend guide */}
      <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-zinc-500 pl-2">
        <span>PRIORIDAD:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />
          <span>MUY URGENTE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block" />
          <span>ALTA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block" />
          <span>MEDIA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700 inline-block" />
          <span>BAJA</span>
        </div>
      </div>

      {/* TASK CREATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-fade-in">
          <div className={`w-full max-w-xl rounded-xl overflow-hidden shadow-2xl relative animate-scale-up border flex flex-col max-h-[90vh] ${
            isDarkMode 
              ? "bg-zinc-950 border-zinc-808 text-zinc-100" 
              : "bg-white border-zinc-200 text-zinc-800"
          }`}>
            
            {/* Modal header visual elements */}
            <div className={`p-5 border-b flex justify-between items-center ${
              isDarkMode ? "border-zinc-900 bg-zinc-950 text-white" : "border-zinc-200 bg-slate-50 text-zinc-900"
            }`}>
              <div>
                <h3 className="text-base font-bold">
                  Crear nueva tarea
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg transition ${
                  isDarkMode ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* ERROR DISPLAY SYSTEM */}
            {errorMessage && (
              <div className={`mx-5 mt-4 p-3.5 border rounded-lg flex gap-3 ${
                isDarkMode 
                  ? "bg-red-950/40 border-red-500/25 text-red-200" 
                  : "bg-red-50 border-red-200 text-red-800"
              }`}>
                <AlertTriangle size={20} className="shrink-0 text-red-500" />
                <div className="text-xs space-y-1">
                  <span className="font-bold block tracking-tight">Fallo en la validación</span>
                  <p className={isDarkMode ? "text-red-300" : "text-red-700"}>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Main Form content wrapper */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-left overflow-y-auto flex-1">
              
              {/* Título */}
              <div className="space-y-1">
                <label className={`block text-xs font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Título de la tarea</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la tarea..."
                  className={`w-full rounded px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 ${
                    isDarkMode 
                      ? "bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-650" 
                      : "bg-white border border-zinc-300 text-zinc-805 placeholder:text-zinc-400"
                  }`}
                />
              </div>

              {/* Categoría & Fecha Límite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                
                <div className="space-y-1">
                  <label className={`block text-xs font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Categoría</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className={`w-full border rounded px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 transition-all ${
                      isDarkMode
                        ? "bg-zinc-900 border-zinc-808 text-white"
                        : "bg-white border-zinc-300 text-zinc-800"
                    }`}
                  >
                    <option value="URGENT" className={isDarkMode ? "bg-zinc-950 text-white font-semibold" : "bg-white text-zinc-800 font-semibold"}>URGENTE</option>
                    <option value="IN_PROGRESS" className={isDarkMode ? "bg-zinc-950 text-white font-semibold" : "bg-white text-zinc-800 font-semibold"}>EN PROCESO</option>
                    <option value="REVIEW" className={isDarkMode ? "bg-zinc-950 text-white font-semibold" : "bg-white text-zinc-800 font-semibold"}>PARA REVISAR</option>
                    <option value="PENDING" className={isDarkMode ? "bg-zinc-950 text-white font-semibold" : "bg-white text-zinc-800 font-semibold"}>PENDIENTE</option>
                    <option value="DONE" className={isDarkMode ? "bg-zinc-950 text-white font-semibold" : "bg-white text-zinc-800 font-semibold"}>TERMINADO</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`block text-xs font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Fecha límite (Opcional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 cursor-pointer ${
                      isDarkMode 
                        ? "bg-zinc-900 border border-zinc-808 text-white focus:ring-cyan-550" 
                        : "bg-white border border-zinc-300 text-zinc-800 focus:ring-cyan-500"
                    }`}
                  />
                </div>

              </div>

              {/* Persona responsable */}
              <div className="space-y-1">
                <label className={`block text-xs font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Persona responsable</label>
                <select
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className={`w-full rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer ${
                    isDarkMode 
                      ? "bg-zinc-900 border border-zinc-808 text-white" 
                      : "bg-white border border-zinc-300 text-zinc-800"
                  }`}
                >
                  <option value="" disabled className={isDarkMode ? "bg-zinc-950 text-zinc-500" : "bg-white text-zinc-405"}>
                    -- Selecciona un responsable del equipo --
                  </option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id} className={isDarkMode ? "bg-zinc-950 text-white" : "bg-white text-zinc-800"}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Etiquetas */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Etiquetas</label>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !selectedTags.includes(val)) {
                        setSelectedTags(prev => [...prev, val]);
                      }
                      e.target.value = "";
                    }}
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 cursor-pointer ${
                      isDarkMode ? "bg-zinc-900 border-zinc-808 text-zinc-200" : "bg-white border-zinc-300 text-zinc-700"
                    }`}
                    value=""
                  >
                    <option value="" disabled className={isDarkMode ? "bg-zinc-950 text-zinc-500" : "bg-white text-zinc-400"}>
                      Elegir etiqueta
                    </option>
                    {tagsBank
                      .filter(t => !selectedTags.includes(t.name))
                      .map(t => (
                        <option 
                          key={t.name} 
                          value={t.name}
                          style={{ color: t.color }}
                          className={`font-semibold ${isDarkMode ? "bg-zinc-950" : "bg-white"}`}
                        >
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
 
                {/* Displaying selected tags with dynamic removal */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTags.map(tagName => {
                      const tagDetail = tagsBank.find(t => t.name.toUpperCase() === tagName.toUpperCase());
                      const colColor = tagDetail?.color || "#64748b";
                      return (
                        <div
                          key={tagName}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold leading-relaxed border transition-all duration-200 animate-fade-in"
                          style={{ 
                            backgroundColor: colColor + "15", 
                            borderColor: colColor + "40", 
                            color: colColor 
                          }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: colColor }}
                          />
                          <span>{tagName}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTags(prev => prev.filter(t => t !== tagName))}
                            className="hover:text-red-400 focus:outline-none font-bold text-xs pl-1 cursor-pointer"
                            title={`Quitar etiqueta ${tagName}`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className={`flex justify-end gap-3 pt-4 border-t ${
                isDarkMode ? "border-zinc-900" : "border-zinc-205"
              }`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 border text-sm font-semibold rounded-lg transition cursor-pointer ${
                    isDarkMode 
                      ? "border-zinc-800 hover:bg-zinc-900 text-zinc-300" 
                      : "border-zinc-300 hover:bg-zinc-100 text-zinc-650"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-sm font-bold rounded-lg transition-all"
                >
                  {isSubmitting ? "Sincronizando..." : "Crear Tarea"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
