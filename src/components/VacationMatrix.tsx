import React, { useState, useMemo, useRef, useEffect } from "react";
import { type Vacation, type TeamMember, type Role, RoleEnum } from "../types";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, X, AlertCircle, Plus, Trash2, ShieldAlert, User } from "lucide-react";

interface VacationMatrixProps {
  vacations: Vacation[];
  teamMembers: TeamMember[];
  onAddVacation: (vacation: Omit<Vacation, "id">) => Promise<{ success: boolean; message?: string }>;
  onUpdateVacation: (vacation: Vacation) => Promise<{ success: boolean; message?: string }>;
  onDeleteVacation: (id: string) => Promise<void>;
  isDarkMode?: boolean;
}

interface CalendarDate {
  id: string; // "2026-06-01"
  day: number;
  month: number; // 0-indexed: 5 = June
  year: number;
  monthLabel: string;
  monthName: string;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export default function VacationMatrix({ 
  vacations, 
  teamMembers, 
  onAddVacation, 
  onUpdateVacation, 
  onDeleteVacation,
  isDarkMode = true
}: VacationMatrixProps) {
  
  // Date viewport slider (June - October 2026 matching Gantt)
  type ViewMode = "day" | "week" | "month";
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [startDay, setStartDay] = useState(22);
  const totalDaysInMonth = 30;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const daysViewport = useMemo<CalendarDate[]>(() => {
    if (viewMode === "month") {
      // 5 months starting from June 2026 (month index 5, i.e. June + July + August + September + October)
      const list: CalendarDate[] = [];
      const months = [5, 6, 7, 8, 9]; // June, July, August, September, October
      const monthLabels = ["JUN", "JUL", "AGO", "SEP", "OCT"];
      const monthNames = ["Junio", "Julio", "Agosto", "Septiembre", "Octubre"];

      months.forEach((m, idx) => {
        const totalDays = getDaysInMonth(2026, m);
        for (let d = 1; d <= totalDays; d++) {
          const mLabel = monthLabels[idx];
          const mName = monthNames[idx];
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
      // "day" or "week" view for June
      const list: CalendarDate[] = [];
      const len = viewMode === "day" ? 1 : 15; // default 15 days window or 1 day window
      for (let i = 0; i < len; i++) {
        const d = startDay + i;
        if (d <= 30) {
          const dateStr = `2026-06-${d.toString().padStart(2, "0")}`;
          list.push({
            id: dateStr,
            day: d,
            month: 5,
            year: 2026,
            monthLabel: "JUN",
            monthName: "Junio"
          });
        }
      }
      return list;
    }
  }, [viewMode, startDay]);

  const viewportSize = useMemo(() => {
    return daysViewport.length;
  }, [daysViewport]);

  // Scroll to current day (June 25) automatically when component mounts or when viewMode changes
  useEffect(() => {
    if (scrollContainerRef.current && daysViewport.length > 0) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const totalWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;

        // Find today's date index (June 25, 2026) in the viewport
        const todayIndex = daysViewport.findIndex(d => d.month === 5 && d.day === 25);

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
  }, [viewMode, startDay, daysViewport]);

  const handlePrevRange = () => {
    setStartDay(prev => Math.max(1, prev - (viewMode === "day" ? 1 : 5)));
  };

  const handleNextRange = () => {
    setStartDay(prev => Math.min(30 - viewportSize + 1, prev + (viewMode === "day" ? 1 : 5)));
  };

  // Add Request Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userId, setUserId] = useState(teamMembers[0]?.id || "");
  const [role, setRole] = useState<Role>("EXPANSOR");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-08");
  const [selectedType, setSelectedType] = useState<string>("vacaciones");
  const [comment, setComment] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter selection helper to match user role on member select
  const handleUserSelectChange = (uId: string) => {
    setUserId(uId);
    const member = teamMembers.find(m => m.id === uId);
    if (member) {
      setRole(member.role);
    }
  };

  // Check if a day falls inside a user's vacation period
  const getDayVacationStatus = (uId: string, day: CalendarDate) => {
    const formattedMonth = (day.month + 1).toString().padStart(2, "0");
    const formattedDay = day.day.toString().padStart(2, "0");
    const currentDate = new Date(`${day.year}-${formattedMonth}-${formattedDay}T12:00:00`);
    
    return vacations.find(vac => {
      if (vac.userId !== uId) return false;
      const start = new Date(vac.startDate + "T00:00:00");
      const end = new Date(vac.endDate + "T23:59:59");
      return currentDate >= start && currentDate <= end;
    });
  };

  const isWeekendDay = (day: CalendarDate) => {
    const date = new Date(day.year, day.month, day.day);
    const w = date.getDay();
    return w === 0 || w === 6;
  };

  const getWeekdayName = (day: CalendarDate) => {
    const date = new Date(day.year, day.month, day.day);
    const w = date.getDay();
    return ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"][w];
  };

  const handleCreateVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setIsSubmitting(true);

    if (new Date(startDate) > new Date(endDate)) {
      setErrorText("La fecha de inicio no puede ser posterior a la fecha de fin.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        userId,
        role,
        startDate,
        endDate,
        status: "PENDING" as const,
        type: selectedType,
        comment: comment.trim() || undefined,
      };

      const res = await onAddVacation(payload);
      if (res.success) {
        setIsFormOpen(false);
        // Reset defaults
        setStartDate("2026-06-01");
        setEndDate("2026-06-08");
        setSelectedType("vacaciones");
        setComment("");
      } else {
        setErrorText(res.message || "Error al registrar la solicitud.");
      }
    } catch (err) {
      setErrorText("Fallo de red al registrar la solicitud de vacaciones.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (vac: Vacation, targetStatus: "APPROVED" | "REJECTED") => {
    try {
      const updated = { ...vac, status: targetStatus };
      const res = await onUpdateVacation(updated);
      if (!res.success) {
        alert(`Error al actualizar estado: ${res.message}`);
      }
    } catch (err) {
      alert("Error de sincronización con el Bunker de Datos.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header action section */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-xl p-4 ${
        isDarkMode 
          ? "bg-zinc-950/80 border-zinc-900" 
          : "bg-white border-zinc-200 shadow-sm"
      }`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${
            isDarkMode ? "text-white" : "text-zinc-800"
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
            Planificación de Vacaciones
          </h2>

        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-stretch sm:self-auto">
          {/* View mode selector */}
          <div className={`flex border rounded-lg p-1 text-sm self-stretch sm:self-auto justify-between ${
            isDarkMode 
              ? "bg-zinc-900 border-zinc-800 text-white" 
              : "bg-slate-100 border-zinc-200 text-zinc-850"
          }`}>
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  if (mode === "day" && startDay > 30) {
                    setStartDay(1);
                  } else if (mode === "week" && startDay > 16) {
                    setStartDay(1);
                  }
                }}
                className={`px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === mode
                    ? "bg-lime-500 text-black shadow-md font-extrabold"
                    : isDarkMode 
                      ? "text-zinc-400 hover:text-white hover:bg-zinc-805" 
                      : "text-zinc-650 hover:text-black hover:bg-slate-205"
                }`}
              >
                {mode === "day" ? "Día" : mode === "week" ? "15 Días" : "TODO"}
              </button>
            ))}
          </div>

          {/* Slider viewport controller - only show for sub-month range */}
          {viewMode !== "month" && (
            <div className={`flex items-center border rounded-lg p-1 font-mono text-sm self-stretch sm:self-auto justify-between ${
              isDarkMode 
                ? "bg-zinc-900 border-zinc-800 text-white" 
                : "bg-slate-100 border-zinc-200 text-zinc-805"
            }`}>
              <button
                onClick={handlePrevRange}
                disabled={startDay === 1}
                className={`p-1 disabled:opacity-30 cursor-pointer transition ${
                  isDarkMode ? "hover:text-cyan-400 text-zinc-300" : "hover:text-cyan-600 text-zinc-600"
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 min-w-[124px] text-center uppercase font-bold text-sm">
                {viewMode === "day" ? `Día ${startDay}` : `Días ${startDay} al ${Math.min(startDay + viewportSize - 1, totalDaysInMonth)}`} JUNIO
              </span>
              <button
                onClick={handleNextRange}
                disabled={startDay >= totalDaysInMonth - viewportSize + 1}
                className={`p-1 disabled:opacity-30 cursor-pointer transition ${
                  isDarkMode ? "hover:text-cyan-400 text-zinc-300" : "hover:text-cyan-600 text-zinc-600"
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setErrorText(null);
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 text-black px-3.5 py-1.5 rounded-lg text-sm font-bold transition shadow-[0_4px_15px_rgba(163,255,0,0.15)] cursor-pointer"
          >
            <Plus size={14} />
            Solicitar días libres
          </button>
        </div>
      </div>

      {/* Main Grid display structure */}
      <div 
        ref={scrollContainerRef}
        className={`border rounded-xl p-4 overflow-x-auto transition-all scrollbar-thin scrollbar-thumb-zinc-800 ${
          isDarkMode 
            ? "bg-zinc-950/60 border-zinc-900" 
            : "bg-white border-zinc-250 shadow-sm"
        }`}
      >
        <div className={`space-y-2 ${
          viewMode === "day" ? "min-w-[550px]" : viewMode === "week" ? "min-w-[990px]" : "min-w-[7200px]"
        }`}>
          
          {/* Header row calendar dates */}
          <div className={`flex items-center text-center font-mono text-sm font-bold border-b pb-2 ${
            isDarkMode ? "text-zinc-500 border-zinc-900/60" : "text-zinc-600 border-zinc-200"
          }`}>
            <div className={`w-[220px] shrink-0 text-left pl-2 ${isDarkMode ? "text-zinc-500" : "text-zinc-800"}`}>
              INTEGRANTE DEL EQUIPO
            </div>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${viewportSize}, minmax(0, 1fr))` }}>
              {daysViewport.map(day => {
                const isWeekend = isWeekendDay(day);
                const wName = getWeekdayName(day);
                
                let headerBg = "";
                if (isWeekend) {
                  headerBg = isDarkMode ? "bg-zinc-900/60 text-zinc-500 border border-zinc-850" : "bg-slate-200/90 text-zinc-600 border border-slate-300";
                } else {
                  headerBg = isDarkMode ? "bg-zinc-900/15 text-zinc-400 border border-transparent" : "bg-slate-50 text-zinc-700 border border-transparent";
                }

                return (
                  <div key={day.id} className={`py-1 rounded flex flex-col items-center justify-center border transition-all ${headerBg}`}>
                    <span className={`text-sm font-mono leading-none font-extrabold mb-0.5 ${
                      isWeekend ? (isDarkMode ? "text-red-400" : "text-red-700") : (isDarkMode ? "text-zinc-500" : "text-zinc-400")
                    }`}>{wName}</span>
                    <span className={`font-bold block text-sm leading-none ${isDarkMode ? "text-zinc-300" : "text-zinc-805"}`}>{day.day}</span>
                    <span className={`text-sm font-mono opacity-60 leading-none mt-0.5 ${isDarkMode ? "text-zinc-500" : "text-zinc-450"}`}>{day.monthLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member rows representing availability blocks */}
          {teamMembers.map(member => {
            return (
              <div 
                key={member.id} 
                className={`flex items-center py-2.5 border-b rounded-lg transition-colors ${
                  isDarkMode 
                    ? "border-zinc-900/30 hover:bg-zinc-900/10" 
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                {/* Team member name */}
                <div className="w-[220px] shrink-0 pl-2 flex items-center gap-2">
                  <User size={14} className="text-[#00F3FF] shrink-0" />
                  <span className={`text-sm font-bold truncate ${
                    isDarkMode ? "text-zinc-200" : "text-black font-extrabold"
                  }`}>
                    {member.name}
                  </span>
                </div>

                {/* Days matrix representation */}
                <div className="flex-1 grid gap-1 h-10" style={{ gridTemplateColumns: `repeat(${viewportSize}, minmax(0, 1fr))` }}>
                  {daysViewport.map(day => {
                    const vacation = getDayVacationStatus(member.id, day);
                    const isWeekend = isWeekendDay(day);

                    let cellBgAndBorder = "";
                    if (vacation) {
                      if (vacation.status === "APPROVED") {
                        cellBgAndBorder = isDarkMode
                          ? "bg-teal-950/60 border-teal-500/40 text-[#A3FF00] shadow-[0_0_8px_rgba(20,184,166,0.05)]"
                          : "bg-teal-100 border-teal-300 text-teal-900 font-bold shadow-sm";
                      } else {
                        cellBgAndBorder = isDarkMode
                          ? "bg-amber-950/40 border-amber-600/30 text-amber-500 border-dashed"
                          : "bg-amber-50 border-amber-300 text-amber-900 border-dashed font-bold shadow-sm";
                      }
                    } else {
                      if (isWeekend) {
                        cellBgAndBorder = isDarkMode
                          ? "bg-zinc-950/90 border border-zinc-900 hover:bg-zinc-950 shadow-inner"
                          : "bg-slate-200/60 border border-slate-300 hover:bg-slate-200 shadow-inner";
                      } else {
                        cellBgAndBorder = isDarkMode
                          ? "bg-zinc-900/15 border-zinc-900/40 hover:bg-zinc-805/10"
                          : "bg-slate-50 border-slate-205 hover:bg-slate-100/80";
                      }
                    }

                    return (
                      <div 
                        key={day.id} 
                        className={`rounded relative flex items-center justify-center border transition ${cellBgAndBorder}`}
                        title={
                          vacation 
                            ? `${member.name} - ${vacation.type ? vacation.type.toUpperCase() : "Vacaciones"} (${vacation.status === "APPROVED" ? "Aprobadas" : "Pendientes"})${vacation.comment ? `: ${vacation.comment}` : ""}: ${vacation.startDate} a ${vacation.endDate}`
                            : `${member.name} - Disponible`
                        }
                      >
                        {vacation ? (
                          <span className="text-sm font-bold font-mono">
                            {vacation.status === "APPROVED" 
                              ? vacation.type === "curso" ? "CUR" : vacation.type === "otro" ? "OTR" : "VAC"
                              : "PEND"}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

        </div>
      </div>

      {/* Grid view showing pending solicitudes requesting administrative actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Solicitudes list */}
        <div className={`border rounded-xl p-5 space-y-4 ${
          isDarkMode ? "bg-zinc-950/80 border-zinc-900" : "bg-white border-zinc-200 shadow-sm"
        }`}>
          <div className={`border-b pb-2 ${isDarkMode ? "border-zinc-900" : "border-zinc-150"}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-zinc-800"}`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
              Solicitudes Pendientes de Aprobación
            </h3>

          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {vacations.filter(v => v.status === "PENDING").length === 0 ? (
              <div className={`text-center p-8 border border-dashed rounded-lg text-sm font-mono ${
                isDarkMode ? "border-zinc-900 text-zinc-500" : "border-zinc-200 text-zinc-400"
              }`}>
                NO HAY SOLICITUDES PENDIENTES DE REVISIÓN
              </div>
            ) : (
              vacations.filter(v => v.status === "PENDING").map(vac => {
                const member = teamMembers.find(t => t.id === vac.userId);
                return (
                  <div 
                    key={vac.id} 
                    className={`p-3 rounded-lg flex justify-between items-center gap-3 transition border ${
                      isDarkMode 
                        ? "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700" 
                        : "bg-slate-50 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div>
                      <span className={`text-sm font-bold block ${isDarkMode ? "text-zinc-200" : "text-zinc-800"}`}>
                        {member?.name || vac.userId}
                      </span>
                      <span className={`text-sm tracking-wider font-mono uppercase block ${isDarkMode ? "text-cyan-405" : "text-cyan-600 font-bold"}`}>
                        {vac.type ? vac.type.toUpperCase() : "VACACIONES"}{vac.comment ? ` · ${vac.comment}` : ""}
                      </span>
                      <span className={`text-sm block mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-550"}`}>
                        Plazo: <b className={isDarkMode ? "text-zinc-300" : "text-zinc-700"}>{vac.startDate}</b> al <b className={isDarkMode ? "text-zinc-300" : "text-zinc-700"}>{vac.endDate}</b>
                      </span>
                    </div>

                    {/* ACTION INTERACTIVE BUTTONS for quick change */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(vac, "APPROVED")}
                        title="Aprobar vacaciones"
                        className="bg-teal-500/20 hover:bg-teal-500 text-teal-400 hover:text-black hover:scale-105 border border-teal-500/30 p-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(vac, "REJECTED")}
                        title="Rechazar solicitud"
                        className="bg-red-500/20 hover:bg-red-550 text-red-400 hover:text-white hover:scale-105 border border-red-500/30 p-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Historico de Vacaciones y Aprobadas */}
        <div className={`border rounded-xl p-5 space-y-4 ${
          isDarkMode ? "bg-zinc-950/80 border-zinc-900" : "bg-white border-zinc-200 shadow-sm"
        }`}>
          <div className={`border-b pb-2 flex justify-between items-center ${isDarkMode ? "border-zinc-900" : "border-zinc-150"}`}>
            <div>
              <h3 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-zinc-800"}`}>
                Historial de Vacaciones Planificadas
              </h3>

            </div>
            <span className={`text-sm px-2.5 py-0.5 font-mono rounded-full font-bold border ${
              isDarkMode 
                ? "bg-zinc-900 border-zinc-800 text-zinc-400" 
                : "bg-slate-100 border-zinc-200 text-zinc-600"
            }`}>
              {vacations.filter(v => v.status === "APPROVED").length} Aprobados
            </span>
          </div>

          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
            {vacations.filter(v => v.status !== "PENDING").length === 0 ? (
              <div className={`text-center p-8 border border-dashed rounded-lg text-sm font-mono ${
                isDarkMode ? "border-zinc-900 text-zinc-500" : "border-zinc-200 text-zinc-400"
              }`}>
                SIN PLANES EN EL HISTORIAL
              </div>
            ) : (
              vacations.filter(v => v.status !== "PENDING").map(vac => {
                const member = teamMembers.find(t => t.id === vac.userId);
                const isApproved = vac.status === "APPROVED";

                return (
                  <div 
                    key={vac.id} 
                    className={`p-2.5 rounded-lg flex justify-between items-center text-sm border ${
                      isDarkMode 
                        ? "bg-zinc-900/20 border-zinc-900/60" 
                        : "bg-slate-50 border-zinc-150"
                    }`}
                  >
                    <div>
                      <span className={`font-semibold ${isDarkMode ? "text-zinc-300" : "text-zinc-800"}`}>
                        {member?.name || vac.userId}
                      </span>
                      <span className={`text-sm font-mono uppercase ml-2 select-all ${isDarkMode ? "text-[#00F3FF]" : "text-cyan-600 font-bold"}`}>
                        {vac.type ? vac.type.toUpperCase() : "VACACIONES"}
                      </span>
                      {vac.comment && (
                        <span className={`text-sm font-sans italic ml-1.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                          ({vac.comment})
                        </span>
                      )}
                      <div className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                        Rango: {vac.startDate} ➜ {vac.endDate}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-sm font-mono font-bold uppercase tracking-wide ${
                        isApproved 
                          ? isDarkMode
                            ? "bg-teal-950 text-teal-400 border border-teal-500/20" 
                            : "bg-teal-50 text-teal-700 border border-teal-200"
                          : isDarkMode
                            ? "bg-zinc-900 text-zinc-500 border border-zinc-800"
                            : "bg-slate-100 text-slate-500 border border-zinc-200"
                      }`}>
                        {isApproved ? "Aprobado" : "Rechazado"}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm("¿Seguro de retirar esta reserva de vacaciones del sistema?")) {
                            onDeleteVacation(vac.id);
                          }
                        }}
                        className={`p-1 rounded transition cursor-pointer ${
                          isDarkMode 
                            ? "text-zinc-600 hover:text-red-400 hover:bg-zinc-900" 
                            : "text-zinc-400 hover:text-red-600 hover:bg-zinc-100"
                        }`}
                        title="Eliminar registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

       {/* VACATION BOOKING MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-xl overflow-hidden shadow-2xl border ${
            isDarkMode 
              ? "bg-zinc-950 border-zinc-850 text-zinc-100" 
              : "bg-white border-zinc-200 text-zinc-800"
          }`}>
            
            <div className={`p-4 border-b flex justify-between items-center ${
              isDarkMode ? "bg-zinc-950 border-zinc-905 text-white" : "bg-slate-50 border-zinc-200 text-zinc-900"
            }`}>
              <div>
                <h3 className="text-sm font-bold">Solicitar días libres</h3>
                <p className={`text-sm font-mono ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>Copia de seguridad del sistema</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className={`p-1 rounded-lg transition ${
                  isDarkMode ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {errorText && (
              <div className={`mx-4 mt-3 p-3 border rounded-lg text-sm flex items-start gap-2 ${
                isDarkMode 
                  ? "bg-red-950/40 border-red-500/25 text-red-350" 
                  : "bg-red-50 border-red-200 text-red-800"
              }`}>
                <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5 animate-bounce" />
                <span>{errorText}</span>
              </div>
            )}

            <form onSubmit={handleCreateVacationSubmit} className="p-4 space-y-4">
              
              <div className="space-y-1">
                <label className={`block text-sm font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>EMPLEADO / INTEGRANTE *</label>
                <select
                  value={userId}
                  onChange={(e) => handleUserSelectChange(e.target.value)}
                  className={`w-full rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer ${
                    isDarkMode 
                      ? "bg-zinc-900 border border-zinc-800 text-white" 
                      : "bg-white border border-zinc-300 text-zinc-800"
                  }`}
                >
                  {teamMembers.map(t => (
                    <option key={t.id} value={t.id} className={isDarkMode ? "bg-zinc-950 text-white" : "bg-white text-zinc-800"}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`block text-sm font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>TIPO DE SOLICITUD *</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className={`w-full rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer ${
                      isDarkMode 
                        ? "bg-zinc-900 border border-zinc-800 text-white" 
                        : "bg-white border border-zinc-300 text-zinc-800"
                    }`}
                  >
                    <option value="vacaciones" className={isDarkMode ? "bg-zinc-950" : "bg-white"}>vacaciones</option>
                    <option value="curso" className={isDarkMode ? "bg-zinc-950" : "bg-white"}>curso</option>
                    <option value="otro" className={isDarkMode ? "bg-zinc-950" : "bg-white"}>otro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`block text-sm font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>COMENTARIO (OPCIONAL)</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder=""
                    className={`w-full rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 ${
                      isDarkMode 
                        ? "bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600" 
                        : "bg-white border border-zinc-300 text-zinc-800 placeholder:text-zinc-400"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`block text-sm font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>FECHA INICIO *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full rounded px-3 py-2 text-sm focus:outline-none ${
                      isDarkMode 
                        ? "bg-zinc-900 border border-zinc-800 text-white" 
                        : "bg-white border border-zinc-300 text-zinc-800"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`block text-sm font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>FECHA FIN *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full rounded px-3 py-2 text-sm focus:outline-none ${
                      isDarkMode 
                        ? "bg-zinc-900 border border-zinc-800 text-white" 
                        : "bg-white border border-zinc-300 text-zinc-800"
                    }`}
                  />
                </div>
              </div>

              <div className={`text-sm font-mono border-t pt-3 ${
                isDarkMode ? "text-zinc-500 border-zinc-900" : "text-zinc-400 border-zinc-200"
              }`}>
                💡 Toda solicitud entra inicialmente como <span className="text-amber-500 font-bold">PENDIENTE</span> y requiere la revisión antes de bloquear la asignación de actividades.
              </div>

              <div className={`flex justify-end gap-3 pt-3 border-t ${
                isDarkMode ? "border-zinc-900" : "border-zinc-200"
              }`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-3.5 py-1.5 border text-sm font-semibold rounded transition cursor-pointer ${
                    isDarkMode 
                      ? "border-zinc-850 hover:bg-zinc-900 text-zinc-300" 
                      : "border-zinc-300 hover:bg-zinc-100 text-zinc-650"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black text-sm font-bold rounded cursor-pointer shrink-0 transition"
                >
                  {isSubmitting ? "Sincronizando..." : "Registrar solicitud"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
