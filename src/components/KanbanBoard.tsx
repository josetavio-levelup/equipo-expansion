import React, { useState } from "react";
import { 
  type Task, 
  type TeamMember, 
  type RouteCity, 
  type Priority, 
  type Status, 
  type TagType,
  StatusEnum 
} from "../types";
import BadgePriority from "./BadgePriority";
import { Plus, Trash2, Edit2, AlertTriangle, ArrowLeft, ArrowRight, Calendar, User, Tag, MapPin, X } from "lucide-react";
import GlassWrapper from "./GlassWrapper";

const getSelectClass = (st: Status, isDark: boolean) => {
  const base = "w-full border rounded px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 transition-all ";
  const colorSuffix = " status-select-colored status-select-colored-" + st.toLowerCase().replace("_", "-");
  if (isDark) {
    switch (st) {
      case "URGENT": return base + "bg-red-950/50 border-red-800 text-red-200 focus:ring-red-500 focus:border-red-500" + colorSuffix;
      case "IN_PROGRESS": return base + "bg-amber-950/40 border-amber-800 text-amber-200 focus:ring-amber-500 focus:border-amber-500" + colorSuffix;
      case "REVIEW": return base + "bg-purple-950/40 border-purple-800 text-purple-200 focus:ring-purple-500 focus:border-purple-500" + colorSuffix;
      case "PENDING": return base + "bg-zinc-900 border-zinc-800 text-zinc-300 focus:ring-cyan-500 focus:border-cyan-500" + colorSuffix;
      case "DONE": return base + "bg-lime-950/40 border-lime-800 text-lime-200 focus:ring-lime-500 focus:border-lime-500" + colorSuffix;
    }
  } else {
    switch (st) {
      case "URGENT": return base + "bg-red-50 border-red-200 text-red-750 focus:ring-red-500 focus:border-red-500" + colorSuffix;
      case "IN_PROGRESS": return base + "bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500 focus:border-amber-500" + colorSuffix;
      case "REVIEW": return base + "bg-purple-50 border-purple-200 text-purple-750 focus:ring-purple-500 focus:border-purple-500" + colorSuffix;
      case "PENDING": return base + "bg-zinc-100 border-zinc-200 text-zinc-700 focus:ring-cyan-500 focus:border-cyan-500" + colorSuffix;
      case "DONE": return base + "bg-lime-50 border-lime-200 text-lime-750 focus:ring-lime-500 focus:border-lime-500" + colorSuffix;
    }
  }
};

const getOptionStyle = (key: Status, isDark: boolean) => {
  if (isDark) {
    switch (key) {
      case "URGENT": return { backgroundColor: "#450a0a", color: "#fecaca" };
      case "IN_PROGRESS": return { backgroundColor: "#451a03", color: "#fef3c7" };
      case "REVIEW": return { backgroundColor: "#3b0764", color: "#f3e8ff" };
      case "PENDING": return { backgroundColor: "#18181b", color: "#e2e8f0" };
      case "DONE": return { backgroundColor: "#1a2e05", color: "#bef264" };
    }
  } else {
    switch (key) {
      case "URGENT": return { backgroundColor: "#fef2f2", color: "#111827" };
      case "IN_PROGRESS": return { backgroundColor: "#fffbeb", color: "#111827" };
      case "REVIEW": return { backgroundColor: "#faf5ff", color: "#111827" };
      case "PENDING": return { backgroundColor: "#f8fafc", color: "#111827" };
      case "DONE": return { backgroundColor: "#f0fdf4", color: "#111827" };
    }
  }
};

interface KanbanBoardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  routeCities: RouteCity[];
  tagsBank: TagType[];
  isDarkMode: boolean;
  currentUserMemberId: string;
  onAddTask: (task: Omit<Task, "id">) => Promise<{ success: boolean; message?: string }>;
  onUpdateTask: (task: Task) => Promise<{ success: boolean; message?: string }>;
  onDeleteTask: (id: string) => Promise<void>;
}

export default function KanbanBoard({ 
  tasks, 
  teamMembers, 
  routeCities, 
  tagsBank = [],
  isDarkMode,
  currentUserMemberId,
  onAddTask, 
  onUpdateTask, 
  onDeleteTask 
}: KanbanBoardProps) {
  
  const columns: { key: Status; label: string; color: string; bg: string }[] = [
    { key: "URGENT", label: "Urgente", color: "border-red-900/45 text-red-400", bg: "bg-red-950/15" },
    { key: "IN_PROGRESS", label: "En proceso", color: "border-amber-900/40 text-amber-400", bg: "bg-amber-950/10" },
    { key: "REVIEW", label: "Para revisar", color: "border-purple-900/40 text-purple-400", bg: "bg-purple-950/10" },
    { key: "PENDING", label: "Pendiente", color: "border-zinc-800 text-zinc-400", bg: "bg-zinc-950/40" },
    { key: "DONE", label: "Terminado", color: "border-lime-900/40 text-lime-400", bg: "bg-lime-950/10" },
  ];

  const [onlyMyTasks, setOnlyMyTasks] = useState<boolean>(false);

  const getStatusBadge = (st: Status, isHeader = false) => {
    const configs = {
      URGENT: {
        bg: "bg-red-950/50 border-red-800/40 text-red-200 animate-pulse",
        dot: "bg-red-500",
        bgLight: "bg-red-50 border-red-200 text-red-750 animate-pulse",
        label: "Urgente"
      },
      IN_PROGRESS: {
        bg: "bg-amber-950/45 border-amber-850/30 text-amber-300 animate-pulse",
        dot: "bg-amber-400",
        bgLight: "bg-amber-50 border-amber-200 text-amber-650 animate-pulse",
        label: "En Proceso"
      },
      REVIEW: {
        bg: "bg-purple-950/40 border-purple-855/30 text-purple-300",
        dot: "bg-purple-400",
        bgLight: "bg-purple-50 border-purple-200 text-purple-700",
        label: "Para Revisar"
      },
      PENDING: {
        bg: "bg-zinc-900 border-zinc-805 text-zinc-450",
        dot: "bg-zinc-500",
        bgLight: "bg-zinc-100 border-zinc-300 text-zinc-600",
        label: "Pendiente"
      },
      DONE: {
        bg: "bg-lime-950/40 border-lime-855/35 text-lime-300",
        dot: "bg-lime-500",
        bgLight: "bg-lime-50 border-lime-200 text-lime-750",
        label: "Terminado"
      }
    };
    
    const config = configs[st] || configs.PENDING;
    const classes = isDarkMode ? config.bg : config.bgLight;
    const paddingClass = "px-3 py-1 text-sm";
    
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold border ${paddingClass} ${classes}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
        {config.label.toUpperCase()}
      </span>
    );
  };

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Drag and Drop state
  const [activeDragOverColumn, setActiveDragOverColumn] = useState<string | null>(null);

  // Drag and Drop status change execution
  const handleMoveDragTask = async (taskId: string, targetStatus: Status) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus) return;

    const updatedTask = {
      ...task,
      status: targetStatus,
    };

    const res = await onUpdateTask(updatedTask);
    if (!res.success) {
      alert(`FALLO AL CAMBIAR ESTADO:\n\n${res.message}`);
    }
  };
  
  // Form fields
  const [title, setTitle] = useState("");
  const [routeId, setRouteId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [status, setStatus] = useState<Status>("PENDING");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Subtasks Checklist State
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  // Error management
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle("");
    setRouteId(routeCities[0]?.id || "");
    setResponsibleId(teamMembers[0]?.id || "");
    setPriority("MEDIUM");
    setStatus("PENDING");
    // Default no-date preview so it is fully optional by default
    setDueDate("");
    setSelectedTags([]);
    setSubtasks([]);
    setNewSubtaskTitle("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setRouteId(task.routeId);
    
    setResponsibleId(task.assignedPair || "");
    
    setPriority(task.priority);
    setStatus(task.status);
    
    // Convert UTC/ISO datetime to local year-month-day string format used by calendar date input
    try {
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDueDate(`${year}-${month}-${day}`);
      } else {
        setDueDate("");
      }
    } catch {
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : "");
    }
    
    setSelectedTags(task.tags || []);
    setSubtasks(task.subtasks || []);
    setNewSubtaskTitle("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleAddSubtaskLocal = () => {
    const titleClean = newSubtaskTitle.trim();
    if (!titleClean) return;
    
    setSubtasks(prev => [
      ...prev,
      { id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, title: titleClean, completed: false }
    ]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtaskLocal = (id: string) => {
    setSubtasks(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleSubtaskLocal = (id: string) => {
    setSubtasks(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleToggleSubtask = async (task: Task, subId: string) => {
    const updatedSubtasks = task.subtasks.map(sub => {
      if (sub.id === subId) {
        return { ...sub, completed: !sub.completed };
      }
      return sub;
    });

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
    let nextStatus = task.status;
    if (allCompleted) {
      nextStatus = "DONE";
    } else if (task.status === "DONE" && !allCompleted) {
      nextStatus = "IN_PROGRESS";
    }

    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks,
      status: nextStatus,
    };
    const res = await onUpdateTask(updatedTask);
    if (!res.success) {
      alert(`Fallo al actualizar subtarea: ${res.message}`);
    }
  };

  const handleToggleMainTaskComplete = async (task: Task) => {
    const isCompleted = task.status === "DONE";
    const updatedTask: Task = {
      ...task,
      status: isCompleted ? "PENDING" : "DONE",
    };
    const res = await onUpdateTask(updatedTask);
    if (!res.success) {
      alert(`Fallo al completar tarea: ${res.message}`);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const pairString = responsibleId;
    const tagsArray = selectedTags;

    // Use MIDDAY time format to standardise dates and prevent timezone shifting bugs
    const formattedDueDate = dueDate ? (dueDate.includes("T") ? dueDate : `${dueDate}T12:00:00`) : "";

    const taskPayload = {
      title,
      routeId,
      assignedPair: pairString,
      priority,
      status,
      dueDate: formattedDueDate,
      tags: tagsArray,
      subtasks,
    };

    try {
      let result;
      if (editingTask) {
        result = await onUpdateTask({
          ...taskPayload,
          id: editingTask.id,
        });
      } else {
        result = await onAddTask(taskPayload);
      }

      if (result.success) {
        setIsModalOpen(false);
      } else {
        setErrorMessage(result.message || "Error al procesar la tarea.");
      }
    } catch (err: any) {
      setErrorMessage("Error de conexión con el Bunker de Datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Immediate column shift helper for seamless execution
  const shiftTaskStatus = async (task: Task, direction: "left" | "right") => {
    const statusKeys = columns.map(c => c.key);
    const currentIndex = statusKeys.indexOf(task.status);
    let nextIndex = currentIndex;

    if (direction === "left" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === "right" && currentIndex < statusKeys.length - 1) {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex !== currentIndex) {
      const updatedTask = {
        ...task,
        status: statusKeys[nextIndex],
      };
      
      const res = await onUpdateTask(updatedTask);
      if (!res.success) {
        // High visibility conflict error
        alert(`FALLO CRÍTICO DE INTERCEPCIÓN:\n\n${res.message}`);
      }
    }
  };

  // Helper names
  const getCityName = (id: string) => routeCities.find(c => c.id === id)?.name || id;
  const getMemberName = (id: string) => teamMembers.find(m => m.id === id)?.name || id;

  const getResponsibleDisplayName = (pairStr: string) => {
    if (!pairStr) return "Sin asignar";
    const parts = pairStr.split("-").filter(Boolean);
    return parts.map(id => getMemberName(id)).join(" ⇄ ");
  };

  return (
    <div className="space-y-6">
      {/* Upper header action section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
            Control de Tareas
          </h2>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setOnlyMyTasks(!onlyMyTasks)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold tracking-tight transition-all border cursor-pointer select-none ${
              onlyMyTasks
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-440 dark:text-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "bg-zinc-900/40 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <User size={14} />
            <span>Sólo mis tareas</span>
          </button>

          <button
            id="btn-create-task"
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black px-4 py-2 rounded-lg text-sm font-semibold tracking-tight transition-all shadow-[0_4px_20px_rgba(6,182,212,0.15)] cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Grid Canvas columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {columns.map(col => {
          const filtered = onlyMyTasks 
            ? tasks.filter(t => t.assignedPair && t.assignedPair.split("-").includes(currentUserMemberId))
            : tasks;
          const colTasks = filtered.filter(t => t.status === col.key);
          const isOver = activeDragOverColumn === col.key;

          return (
            <div 
              key={col.key} 
              onDragOver={(e) => {
                e.preventDefault();
                if (activeDragOverColumn !== col.key) {
                  setActiveDragOverColumn(col.key);
                }
              }}
              onDragLeave={() => {
                setActiveDragOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setActiveDragOverColumn(null);
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) {
                  handleMoveDragTask(taskId, col.key);
                }
              }}
              className={`rounded-xl border p-4 flex flex-col min-h-[500px] transition-all duration-300 ${
                isOver 
                  ? "bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/10" 
                  : `${col.color} ${col.bg}`
              }`}
            >
              {/* Header column */}
              <div className="flex justify-between items-center mb-4 border-b border-zinc-900/10 dark:border-zinc-900 pb-2">
                {getStatusBadge(col.key, true)}
                <span className="bg-zinc-900/10 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 font-mono text-sm w-7 h-7 flex items-center justify-center rounded-full font-bold">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks list inside column */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-zinc-300 dark:border-zinc-900 rounded-lg flex flex-col items-center justify-center p-4">
                    <span className="text-sm font-mono text-zinc-400 dark:text-zinc-600 text-center">
                      SIN TAREAS
                    </span>
                  </div>
                ) : (
                  colTasks.map(task => {
                    const isCritical = task.priority === "CRITICAL";

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", task.id);
                        }}
                        className={`group relative border rounded-lg p-3.5 space-y-3 transition-all hover:translate-y-[-2px] cursor-grab active:cursor-grabbing ${
                          isDarkMode
                            ? isCritical
                                ? "bg-zinc-950 border-red-600/35 shadow-[0_0_15px_rgba(239,68,68,0.04)] hover:bg-zinc-900/40 text-zinc-100"
                                : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-105"
                            : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-slate-50 text-zinc-800 shadow-sm"
                        }`}
                      >
                        {/* Task controls header */}
                        <div className="flex justify-end items-center h-4 pb-0.5">
                          {/* Item controls action buttons */}
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(task)}
                              title="Editar tarea"
                              className="text-zinc-400 hover:text-cyan-500 p-0.5 rounded cursor-pointer"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("¿Estás seguro de eliminar esta tarea del Bunker?")) {
                                  onDeleteTask(task.id);
                                }
                              }}
                              title="Eliminar del Bunker"
                              className="text-zinc-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Description label block with check icon to toggle status to DONE */}
                        <div className="flex items-start gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleMainTaskComplete(task)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                              task.status === "DONE"
                                ? "bg-[#A3FF00] border-[#A3FF00] text-black shadow-[0_0_8px_rgba(163,255,0,0.3)]"
                                : "border-zinc-300 dark:border-zinc-700 text-transparent hover:border-[#A3FF00] hover:bg-[#A3FF00]/10"
                            }`}
                            title={task.status === "DONE" ? "Marcar como pendiente" : "Marcar como terminado"}
                          >
                            <span className="text-sm font-extrabold leading-none">
                              {task.status === "DONE" ? "✓" : ""}
                            </span>
                          </button>
                          <h4 className={`text-sm font-semibold leading-tight flex-1 transition-all ${
                            task.status === "DONE" 
                              ? "line-through text-zinc-400 dark:text-zinc-500" 
                              : isDarkMode ? "text-zinc-100" : "text-zinc-800"
                          }`}>
                            {task.title}
                          </h4>
                        </div>

                        {/* Responsible and Date displays */}
                        <div className="space-y-1.5 text-sm font-mono">
                          
                          <div className="flex items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-900/60 pt-1.5 mt-1 text-zinc-650 dark:text-zinc-300">
                            <User size={14} className="text-[#00F3FF]" />
                            <span className="truncate leading-none">
                              {getResponsibleDisplayName(task.assignedPair)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-sm">
                            <Calendar size={14} />
                            <span>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }) : "Sin fecha límite"}
                            </span>
                          </div>
                        </div>

                        {/* Dynamic Subtasks checklist with microinteraction */}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/40">
                            <div className="flex justify-between items-center text-sm font-mono text-zinc-500 font-bold whitespace-nowrap">
                              <span>CHECKLIST</span>
                              <span className="text-[#00F3FF]">
                                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                              </span>
                            </div>
                            <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
                              {task.subtasks.map(sub => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSubtask(task, sub.id);
                                  }}
                                  className="w-full flex items-start gap-1.5 text-sm text-left p-1 rounded hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 transition text-zinc-600 dark:text-zinc-300 cursor-pointer"
                                >
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                    sub.completed 
                                      ? "bg-[#00F3FF]/20 border-[#00F3FF] text-[#00F3FF]" 
                                      : "border-zinc-300 dark:border-zinc-800 text-transparent hover:border-zinc-500"
                                  }`}>
                                    {sub.completed && <span className="text-sm font-bold">✓</span>}
                                  </span>
                                  <span className={`truncate leading-tight flex-1 ${sub.completed ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-350"}`}>
                                    {sub.title}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Display tags list */}
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-zinc-100 dark:border-zinc-900/40">
                            {task.tags.map((tag, i) => {
                              const tagDetail = tagsBank.find(t => t.name.toUpperCase() === tag.toUpperCase());
                              const colColor = tagDetail?.color || "#64748b";
                              return (
                                <span
                                  key={i}
                                  className="text-sm font-mono px-2 py-0.5 rounded border font-bold select-none transition"
                                  style={{
                                    backgroundColor: colColor + "15",
                                    borderColor: colColor + "38",
                                    color: colColor
                                  }}
                                >
                                  #{tag.toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TASK MODAL FOR CREATE & UPDATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-fade-in">
          <div className={`w-full max-w-xl rounded-xl overflow-hidden shadow-2xl relative border ${
            isDarkMode 
              ? "bg-zinc-950 border-zinc-808 text-zinc-100" 
              : "bg-white border-zinc-200 text-zinc-800"
          }`}>
            
            {/* Modal header visual elements */}
            <div className={`p-5 border-b flex justify-between items-center ${
              isDarkMode ? "border-zinc-900 bg-zinc-950 text-white" : "border-zinc-200 bg-slate-50 text-zinc-900"
            }`}>
              <h3 className="text-base font-bold">
                {editingTask ? "Modificar tarea" : "Crear nueva tarea"}
              </h3>
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
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              
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
                      ? "bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600" 
                      : "bg-white border border-zinc-300 text-zinc-805 placeholder:text-zinc-400"
                  }`}
                />
              </div>
 
              {/* Categoría & Fecha Límite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                   <label className={`block text-xs font-mono font-medium ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Categoría</label>
                   <select
                     value={status}
                     onChange={(e) => setStatus(e.target.value as Status)}
                     className={getSelectClass(status, isDarkMode)}
                   >
                     {columns.map(c => (
                       <option 
                         key={c.key} 
                         value={c.key}
                         style={getOptionStyle(c.key, isDarkMode)}
                         className={`font-semibold status-option-colored status-option-colored-${c.key.toLowerCase().replace("_", "-")}`}
                       >
                         {c.label.toUpperCase()}
                       </option>
                     ))}
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
 
              {/* Checklist de subtareas */}
              <div className={`p-3.5 space-y-3 rounded-lg border ${
                isDarkMode 
                  ? "bg-zinc-900/40 border-zinc-900" 
                  : "bg-slate-50/55 border-zinc-200"
              }`}>
                <span className={`block text-xs font-mono font-semibold uppercase tracking-wide ${
                  isDarkMode ? "text-zinc-300" : "text-zinc-700"
                }`}>
                  Checklist ({subtasks.length})
                </span>
 
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Añadir elemento al checklist..."
                    className={`flex-1 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 ${
                      isDarkMode 
                        ? "bg-zinc-950 border border-zinc-850 text-white placeholder:text-zinc-650" 
                        : "bg-white border border-zinc-300 text-zinc-800 placeholder:text-zinc-400"
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtaskLocal();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubtaskLocal()}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] uppercase px-3.5 rounded transition cursor-pointer shrink-0"
                  >
                    Agregar
                  </button>
                </div>
 
                {subtasks.length > 0 && (
                  <div className={`space-y-1 max-h-[140px] overflow-y-auto pr-1 border p-2 rounded ${
                    isDarkMode ? "bg-zinc-950/25 border-zinc-900" : "bg-white border-zinc-200"
                  }`}>
                    {subtasks.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between gap-2 py-1 px-1.5 rounded transition ${
                          isDarkMode ? "hover:bg-zinc-900/45" : "hover:bg-slate-50"
                        }`}
                      >
                        <label className={`flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 ${
                          isDarkMode ? "text-zinc-300" : "text-zinc-700"
                        }`}>
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleSubtaskLocal(item.id)}
                            className={`rounded text-cyan-500 focus:ring-0 cursor-pointer ${
                              isDarkMode ? "bg-zinc-900 border-zinc-808" : "bg-white border-zinc-300"
                            }`}
                          />
                          <span className={`text-[11px] truncate ${
                            item.completed 
                              ? "line-through text-zinc-400 dark:text-zinc-500" 
                              : isDarkMode ? "text-zinc-300" : "text-zinc-700"
                          }`}>
                            {item.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtaskLocal(item.id)}
                          className={`font-extrabold px-1 text-xs cursor-pointer ${
                            isDarkMode ? "text-zinc-500 hover:text-red-400" : "text-zinc-400 hover:text-red-650"
                          }`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  className={`px-4 py-2 border text-sm font-semibold rounded-lg transition-all cursor-pointer ${
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
                  {isSubmitting ? "Sincronizando..." : editingTask ? "Actualizar Tarea" : "Crear Tarea"}
                </button>
              </div>
 
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
