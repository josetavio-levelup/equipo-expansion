import React, { useState } from "react";
import { type TeamMember, type Role, type TagType, type Holiday } from "../types";
import { Users, Tag, Plus, Trash2, AlertTriangle, CheckCircle, Edit2, X, Calendar } from "lucide-react";

interface ControlPanelProps {
  teamMembers: TeamMember[];
  tagsBank: TagType[];
  onAddTeamMember: (member: { id: string; name: string; role: Role; email?: string; allowedViews?: string[] }) => Promise<{ success: boolean; message?: string }>;
  onUpdateTeamMember: (member: { id: string; name: string; role: Role; email?: string; allowedViews?: string[] }) => Promise<{ success: boolean; message?: string }>;
  onDeleteTeamMember: (id: string) => Promise<{ success: boolean; message?: string }>;
  onAddTag: (tag: string, color?: string) => Promise<{ success: boolean; message?: string }>;
  onDeleteTag: (tag: string) => Promise<{ success: boolean; message?: string }>;
  isAdminProtected: boolean;
  onSetAdminProtected: (val: boolean) => void;
  isDarkMode?: boolean;
  holidays: Holiday[];
  onAddHoliday: (holiday: { date: string; name: string }) => Promise<{ success: boolean; message?: string }>;
  onDeleteHoliday: (id: string) => Promise<{ success: boolean; message?: string }>;
}

export default function ControlPanel({
  teamMembers,
  tagsBank,
  onAddTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onAddTag,
  onDeleteTag,
  isAdminProtected,
  onSetAdminProtected,
  isDarkMode = true,
  holidays,
  onAddHoliday,
  onDeleteHoliday,
}: ControlPanelProps) {
  // Team Member Form State
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole] = useState<Role>("OFICINA");
  const [selectedViews, setSelectedViews] = useState<string[]>(["tasks", "calendar", "vacations"]);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState(false);

  // Tag Form State
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#06b6d4");

  const PALETTE_COLORS = [
    { name: "Cian", value: "#06b6d4" },
    { name: "Verde", value: "#10b981" },
    { name: "Rojo", value: "#ef4444" },
    { name: "Violeta", value: "#8b5cf6" },
    { name: "Ámbar", value: "#f59e0b" },
    { name: "Rosa", value: "#ec4899" },
    { name: "Naranja", value: "#f97316" },
    { name: "Gris", value: "#64748b" },
  ];

  const [isSubmitting, setIsSubmitting] = useState({
    member: false,
    tag: false,
    editMember: false,
    holiday: false,
  });

  // Holiday Form State
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [holidaySuccess, setHolidaySuccess] = useState(false);

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolidayError(null);
    setHolidaySuccess(false);

    const nameClean = holidayName.trim();
    const dateClean = holidayDate.trim();

    if (!nameClean || !dateClean) {
      setHolidayError("La fecha y el nombre del festivo son obligatorios.");
      return;
    }

    setIsSubmitting(prev => ({ ...prev, holiday: true }));
    const result = await onAddHoliday({ date: dateClean, name: nameClean });
    setIsSubmitting(prev => ({ ...prev, holiday: false }));

    if (result.success) {
      setHolidayName("");
      setHolidayDate("");
      setHolidaySuccess(true);
      setTimeout(() => setHolidaySuccess(false), 3000);
    } else {
      setHolidayError(result.message || "Error al agregar el día festivo.");
    }
  };

  // Edit member state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editViews, setEditViews] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditMember = (m: TeamMember) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditEmail(m.email || "");
    setEditViews(m.allowedViews || ["tasks", "calendar", "vacations"]);
    setEditError(null);
  };

  const handleToggleEditView = (viewKey: string) => {
    setEditViews(prev =>
      prev.includes(viewKey) ? prev.filter(v => v !== viewKey) : [...prev, viewKey]
    );
  };

  const handleSaveEditMember = async () => {
    if (!editingMember) return;
    const nameClean = editName.trim();
    const emailClean = editEmail.trim().toLowerCase();
    if (!nameClean || !emailClean) {
      setEditError("Nombre y correo son obligatorios.");
      return;
    }
    if (!emailClean.includes("@")) {
      setEditError("Introduce un correo electrónico válido.");
      return;
    }
    setIsSubmitting(prev => ({ ...prev, editMember: true }));
    const result = await onUpdateTeamMember({
      ...editingMember,
      name: nameClean,
      email: emailClean,
      allowedViews: editViews,
    });
    setIsSubmitting(prev => ({ ...prev, editMember: false }));
    if (result.success) {
      setEditingMember(null);
    } else {
      setEditError(result.message || "Error al actualizar el integrante.");
    }
  };

  const handleToggleView = (viewKey: string) => {
    if (selectedViews.includes(viewKey)) {
      setSelectedViews(prev => prev.filter(v => v !== viewKey));
    } else {
      setSelectedViews(prev => [...prev, viewKey]);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(null);
    setMemberSuccess(false);

    const nameClean = memberName.trim();
    const emailClean = memberEmail.trim().toLowerCase();

    if (!nameClean || !emailClean) {
      setMemberError("Todos los campos (nombre y correo) son obligatorios.");
      return;
    }

    if (!emailClean.includes("@")) {
      setMemberError("Introduce un correo electrónico válido.");
      return;
    }

    // Generate prefix-based neat ID
    const emailPrefix = emailClean.split("@")[0].replace(/[^a-z0-9_]/g, "_");
    const prefix = memberRole === "OFICINA" ? "o_" : memberRole === "EXPANSOR" ? "e_" : "t_";
    const generatedId = `${prefix}${emailPrefix}`;

    setIsSubmitting(prev => ({ ...prev, member: true }));
    const result = await onAddTeamMember({ 
      id: generatedId, 
      name: nameClean, 
      role: memberRole,
      email: emailClean,
      allowedViews: selectedViews
    });
    setIsSubmitting(prev => ({ ...prev, member: false }));

    if (result.success) {
      setMemberName("");
      setMemberEmail("");
      setSelectedViews(["tasks", "calendar", "vacations"]);
      setMemberSuccess(true);
      setTimeout(() => setMemberSuccess(false), 3000);
    } else {
      setMemberError(result.message || "Error al registrar el integrante.");
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas retirar a '${name}' del equipo?`)) {
      return;
    }
    const result = await onDeleteTeamMember(id);
    if (!result.success) {
      alert(result.message || "No se pudo retirar el recurso del equipo.");
    }
  };

  // Handlers for Tag Management
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setTagError(null);
    setTagSuccess(false);

    const tagClean = newTag.trim().toUpperCase();
    if (!tagClean) {
      setTagError("La etiqueta no puede estar vacía.");
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(tagClean)) {
      setTagError("Usa solo letras mayúsculas, números y guiones bajos (como LOGISTICA_EXTERNA).");
      return;
    }

    setIsSubmitting(prev => ({ ...prev, tag: true }));
    const result = await onAddTag(tagClean, selectedColor);
    setIsSubmitting(prev => ({ ...prev, tag: false }));

    if (result.success) {
      setNewTag("");
      setSelectedColor("#06b6d4");
      setTagSuccess(true);
      setTimeout(() => setTagSuccess(false), 3000);
    } else {
      setTagError(result.message || "Error al crear etiqueta.");
    }
  };

  const handleDeleteTagValue = async (tag: string) => {
    if (!confirm(`¿Eliminar la etiqueta global #${tag}?`)) {
      return;
    }
    const result = await onDeleteTag(tag);
    if (!result.success) {
      alert(result.message || "Fallo al desactivar la etiqueta.");
    }
  };

  // Human view mapping dictionary
  const viewLabels: Record<string, string> = {
    tasks: "Tablón de tareas",
    calendar: "Calendario",
    vacations: "Vacaciones",
    control: "Administrador",
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Intro Banner */}
      <div className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in ${
        isDarkMode 
          ? "bg-zinc-950/80 border-zinc-900 text-white" 
          : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block animate-pulse" />
            Configuración del Administrador
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-zinc-400" : "text-zinc-550"}`}>
            Gestión interna de integrantes del equipo y etiquetas globales del sistema
          </p>
        </div>

        {/* Access control lock config switch */}
        <div className={`flex items-center gap-3 border px-3 py-1.5 rounded-lg self-stretch sm:self-auto justify-between sm:justify-start ${
          isDarkMode 
            ? "bg-zinc-900/50 border-zinc-850" 
            : "bg-slate-50 border-zinc-200"
        }`}>
          <div className="flex flex-col text-left">
            <span className={`text-[9px] uppercase font-mono font-bold tracking-wider ${
              isDarkMode ? "text-zinc-400" : "text-zinc-600"
            }`}>Restringir esta pestaña</span>
            <span className={`text-[9px] lowercase ${
              isDarkMode ? "text-zinc-500" : "text-zinc-400"
            }`}>Solicitar clave levelup</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={isAdminProtected} 
              onChange={(e) => onSetAdminProtected(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500 ${
              isDarkMode 
                ? "bg-zinc-800 after:bg-zinc-500" 
                : "bg-zinc-300 after:bg-white"
            }`}></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: TEAM MEMBERS */}
        <div className={`border rounded-xl p-5 space-y-4 flex flex-col ${
          isDarkMode 
            ? "bg-zinc-950/60 border-zinc-900 text-white" 
            : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
        }`}>
          <div className={`flex items-center gap-2 pb-3 border-b ${
            isDarkMode ? "border-zinc-900" : "border-zinc-200"
          }`}>
            <Users size={16} className="text-cyan-500" />
            <h3 className={`font-bold text-sm uppercase tracking-wide ${
              isDarkMode ? "text-zinc-100" : "text-zinc-800"
            }`}>
              Integrantes del equipo
            </h3>
          </div>

          {/* Form to Add Team Member */}
          <form onSubmit={handleCreateMember} className={`space-y-4 p-4 rounded-lg border text-left ${
            isDarkMode 
              ? "bg-zinc-950 border-zinc-900" 
              : "bg-slate-50 border-slate-200/60"
          }`}>
            <span className={`block text-[10px] font-mono select-none font-bold uppercase tracking-wider ${
              isDarkMode ? "text-cyan-400" : "text-cyan-600"
            }`}>
              Nuevo integrante de equipo
            </span>

            {memberError && (
              <div className={`p-2.5 border rounded text-[10px] font-sans flex items-start gap-1 ${
                isDarkMode 
                  ? "bg-red-950/40 border-red-500/20 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <AlertTriangle size={12} className={isDarkMode ? "text-red-500 shrink-0 mt-0.5" : "text-red-600 shrink-0 mt-0.5"} />
                <span>{memberError}</span>
              </div>
            )}

            {memberSuccess && (
              <div className={`p-2 border rounded text-[10px] font-sans flex items-center gap-1.5 ${
                isDarkMode 
                  ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}>
                <CheckCircle size={12} className={isDarkMode ? "text-emerald-500" : "text-emerald-600"} />
                <span>Integrante agregado con éxito.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 text-left">
                <label className={`block text-[10px] font-mono uppercase ${
                  isDarkMode ? "text-zinc-400" : "text-zinc-500"
                }`}>Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Nombre de pila y apellido"
                  className={`w-full rounded px-2.5 py-1.5 text-xs transition ${
                    isDarkMode 
                      ? "bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-cyan-500" 
                      : "bg-white border border-slate-200 text-zinc-850 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  }`}
                />
              </div>

              <div className="space-y-1 text-left">
                <label className={`block text-[10px] font-mono uppercase ${
                  isDarkMode ? "text-zinc-400" : "text-zinc-500"
                }`}>Email *</label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="ejemplo@levelupdesarrollo.com"
                  className={`w-full rounded px-2.5 py-1.5 text-xs transition ${
                    isDarkMode 
                      ? "bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-cyan-500" 
                      : "bg-white border border-slate-200 text-zinc-850 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  }`}
                />
              </div>
            </div>

            {/* View selectors / Authorization checklist */}
            <div className="space-y-1.5 text-left pt-1">
              <label className={`block text-[10px] font-mono uppercase mb-1 ${
                isDarkMode ? "text-zinc-400" : "text-zinc-500"
              }`}>Elegir vistas accesibles para esta persona</label>
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(viewLabels).map(([key, label]) => {
                  const isChecked = selectedViews.includes(key);
                  return (
                    <label 
                      key={key} 
                      className={`flex items-center gap-2 p-2 rounded border text-[10px] cursor-pointer transition select-none ${
                        isChecked 
                          ? isDarkMode 
                            ? "bg-zinc-900/80 border-cyan-500/40 text-cyan-300" 
                            : "bg-cyan-50 border-cyan-500/40 text-cyan-800 font-medium"
                          : isDarkMode 
                            ? "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                            : "bg-white border-slate-200 text-zinc-655 hover:text-zinc-800 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleView(key)}
                        className={`rounded focus:ring-0 focus:ring-offset-0 ${
                          isDarkMode 
                            ? "bg-zinc-900 border-zinc-800 text-cyan-500" 
                            : "bg-white border-slate-300 text-cyan-600"
                        }`}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting.member}
              className={`w-full font-bold uppercase py-2 text-[10px] rounded tracking-wide transition flex items-center justify-center gap-1 cursor-pointer ${
                isDarkMode 
                  ? "bg-cyan-650 hover:bg-cyan-550 text-black" 
                  : "bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold"
              }`}
            >
              <Plus size={11} className="stroke-[3]" />
              {isSubmitting.member ? "Guardando..." : "Crear integrante"}
            </button>
          </form>

          {/* List display */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
            <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider text-left ${
              isDarkMode ? "text-zinc-500" : "text-zinc-400"
            }`}>
              Integrantes del equipo ({teamMembers.length})
            </span>
            {teamMembers.map(m => (
              <div 
                key={m.id} 
                className={`flex items-center justify-between p-3 border rounded transition ${
                  isDarkMode 
                    ? "bg-zinc-900/30 border-zinc-900 hover:border-zinc-800" 
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="space-y-1 pr-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`block text-xs font-bold leading-tight ${
                      isDarkMode ? "text-white" : "text-zinc-800"
                    }`}>{m.name}</span>
                  </div>
                  
                  {m.email && (
                    <span className={`block text-[10px] font-mono leading-tight ${
                      isDarkMode ? "text-zinc-400" : "text-zinc-500"
                    }`}>{m.email}</span>
                  )}
                  
                  {/* Authorized views visualization list */}
                  <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px]">
                    <span className={`font-mono text-[8px] uppercase font-semibold mr-0.5 ${
                      isDarkMode ? "text-zinc-500" : "text-zinc-400"
                    }`}>Vistas autorizadas:</span>
                    {m.allowedViews && m.allowedViews.length > 0 ? (
                      m.allowedViews.map(v => (
                        <span key={v} className={`border px-1 py-0.2 rounded text-[8px] ${
                          isDarkMode 
                            ? "bg-zinc-900/80 border-zinc-850 text-zinc-400" 
                            : "bg-slate-100 border-slate-200/60 text-zinc-600"
                        }`}>
                          {viewLabels[v] || v}
                        </span>
                      ))
                    ) : (
                      <span className="italic text-[8px] text-zinc-400">Ninguna vista asignada</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditMember(m)}
                    className={`p-1 px-1.5 rounded transition border border-transparent cursor-pointer flex items-center justify-center ${
                      isDarkMode 
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-cyan-400 hover:border-zinc-700" 
                        : "text-zinc-400 hover:bg-slate-100 hover:text-cyan-600 hover:border-slate-200"
                    }`}
                    title="Editar integrante"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteMember(m.id, m.name)}
                    className={`p-1 px-1.5 rounded transition border border-transparent cursor-pointer flex items-center justify-center ${
                      isDarkMode 
                        ? "text-red-405 hover:bg-red-950/20 hover:text-red-300 hover:border-red-900/40" 
                        : "text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200/50"
                    }`}
                    title="Dar de baja"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inline edit modal */}
          {editingMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className={`w-full max-w-sm rounded-xl border p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] ${
                isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-800"
              }`}>
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold">Editar integrante</h4>
                  <button onClick={() => setEditingMember(null)} className={`p-1 rounded transition ${isDarkMode ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-700"}`}>
                    <X size={16} />
                  </button>
                </div>

                {editError && (
                  <div className={`p-2.5 border rounded text-[10px] flex items-start gap-1 ${
                    isDarkMode ? "bg-red-950/40 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className={`block text-[10px] font-mono uppercase ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Nombre *</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className={`w-full rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 ${
                        isDarkMode ? "bg-zinc-900 border border-zinc-800 text-white" : "bg-white border border-slate-200 text-zinc-850"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`block text-[10px] font-mono uppercase ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Email *</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className={`w-full rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 ${
                        isDarkMode ? "bg-zinc-900 border border-zinc-800 text-white" : "bg-white border border-slate-200 text-zinc-850"
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-mono uppercase ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>Vistas accesibles</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(viewLabels).map(([key, label]) => {
                        const checked = editViews.includes(key);
                        return (
                          <label key={key} className={`flex items-center gap-2 p-1.5 rounded border text-[10px] cursor-pointer transition select-none ${
                            checked
                              ? isDarkMode ? "bg-zinc-900/80 border-cyan-500/40 text-cyan-300" : "bg-cyan-50 border-cyan-500/40 text-cyan-800"
                              : isDarkMode ? "bg-zinc-950/40 border-zinc-900 text-zinc-500" : "bg-white border-slate-200 text-zinc-600"
                          }`}>
                            <input type="checkbox" checked={checked} onChange={() => handleToggleEditView(key)} className="rounded focus:ring-0" />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingMember(null)}
                    className={`flex-1 py-2 text-xs font-bold rounded border transition ${
                      isDarkMode ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900" : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEditMember}
                    disabled={isSubmitting.editMember}
                    className="flex-1 py-2 text-xs font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black transition disabled:opacity-50"
                  >
                    {isSubmitting.editMember ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* RIGHT SIDE SETTINGS: TAGS & HOLIDAYS */}
        <div className="space-y-6">
          
          {/* PANEL 2: TAGS */}
          <div className={`border rounded-xl p-5 space-y-4 flex flex-col ${
            isDarkMode 
              ? "bg-zinc-950/60 border-zinc-900 text-white" 
              : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
          }`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${
              isDarkMode ? "border-zinc-900" : "border-zinc-200"
            }`}>
              <Tag size={16} className="text-amber-500" />
              <h3 className={`font-bold text-sm uppercase tracking-wide ${
                isDarkMode ? "text-zinc-100" : "text-zinc-800"
              }`}>
                Administrar etiquetas
              </h3>
            </div>

            {/* Form to Add Tag */}
            <form onSubmit={handleCreateTag} className={`space-y-3 p-3 rounded-lg border text-left ${
              isDarkMode 
                ? "bg-zinc-950 border-zinc-900" 
                : "bg-slate-50 border-slate-200/60"
            }`}>
              <span className={`block text-[10px] font-mono select-none font-bold uppercase ${
                isDarkMode ? "text-zinc-500" : "text-zinc-400"
              }`}>
                Agregar Nueva Etiqueta Global
              </span>

              {tagError && (
                <div className={`p-2.5 border rounded text-[10px] font-sans flex items-start gap-1 ${
                  isDarkMode 
                    ? "bg-red-950/40 border-red-500/20 text-red-300"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <AlertTriangle size={12} className={isDarkMode ? "text-red-500 shrink-0 mt-0.5" : "text-red-600 shrink-0 mt-0.5"} />
                  <span>{tagError}</span>
                </div>
              )}

              {tagSuccess && (
                <div className={`p-2 border rounded text-[10px] font-sans flex items-center gap-1.5 ${
                  isDarkMode 
                    ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}>
                  <CheckCircle size={12} className={isDarkMode ? "text-emerald-500" : "text-emerald-600"} />
                  <span>Etiqueta creada correctamente.</span>
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className={`block text-[10px] font-mono uppercase ${
                  isDarkMode ? "text-zinc-400" : "text-zinc-500"
                }`}>Título de Etiqueta (MAYÚSCULAS) *</label>
                <input
                  type="text"
                  required
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="AUDITORIA_FINANZAS"
                  className={`w-full rounded px-2.5 py-1.5 text-xs uppercase placeholder:normal-case focus:outline-none transition ${
                    isDarkMode 
                      ? "bg-zinc-900 border border-zinc-800 text-white focus:border-amber-500" 
                      : "bg-white border border-slate-200 text-zinc-850 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                  }`}
                />
                <span className={`text-[9px] block ${
                  isDarkMode ? "text-zinc-500" : "text-zinc-400"
                }`}>Formato UPPERCASE sin espacios.</span>
              </div>

              {/* Color Palette Selector */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-[10px] font-mono uppercase ${
                  isDarkMode ? "text-zinc-400" : "text-zinc-500"
                }`}>Color de la etiqueta</label>
                <div className="flex flex-wrap gap-2.5 py-1">
                  {PALETTE_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-6 h-6 rounded-full border focus:outline-none transition-all duration-200 relative p-0 hover:scale-110 cursor-pointer ${
                        isDarkMode ? "border-zinc-800" : "border-slate-200"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {selectedColor === c.value && (
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting.tag}
                className={`w-full font-bold uppercase py-1.5 text-[10px] rounded tracking-wide transition flex items-center justify-center gap-1 cursor-pointer ${
                  isDarkMode 
                    ? "bg-amber-500 hover:bg-amber-400 text-black" 
                    : "bg-amber-500 hover:bg-amber-600 text-white font-extrabold"
                }`}
              >
                <Plus size={11} className="stroke-[3]" />
                {isSubmitting.tag ? "Validando..." : "Crear Etiqueta"}
              </button>
            </form>

            {/* List display */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
              <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider text-left ${
                isDarkMode ? "text-zinc-500" : "text-zinc-400"
              }`}>
                Etiquetas activas ({tagsBank.length})
              </span>
              <div className={`flex flex-wrap gap-2 p-1.5 border rounded-lg ${
                isDarkMode 
                  ? "border-zinc-900 bg-zinc-900/10" 
                  : "border-slate-100 bg-slate-50/50"
              }`}>
                {tagsBank.length === 0 ? (
                  <div className={`text-[10px] font-mono italic p-2 text-center w-full ${
                    isDarkMode ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    No hay etiquetas creadas.
                  </div>
                ) : (
                  tagsBank.map(tag => (
                    <div 
                      key={tag.name}
                      className={`flex items-center gap-1.5 border text-[10px] font-mono py-1 px-2.5 rounded-full transition group ${
                        isDarkMode 
                          ? "bg-zinc-900 hover:bg-zinc-800" 
                          : "bg-white hover:bg-slate-50 shadow-sm"
                      }`}
                      style={{ borderColor: tag.color + "50", color: tag.color }}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>#{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTagValue(tag.name)}
                        className={`font-bold transition font-sans cursor-pointer text-xs ml-1 ${
                          isDarkMode ? "text-zinc-500 hover:text-red-400" : "text-zinc-400 hover:text-red-500"
                        }`}
                        title={`Eliminar etiqueta #${tag.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* PANEL 3: HOLIDAYS */}
          <div className={`border rounded-xl p-5 space-y-4 flex flex-col ${
            isDarkMode 
              ? "bg-zinc-950/60 border-zinc-900 text-white" 
              : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
          }`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${
              isDarkMode ? "border-zinc-900" : "border-zinc-200"
            }`}>
              <Calendar size={16} className="text-purple-500" />
              <h3 className={`font-bold text-sm uppercase tracking-wide ${
                isDarkMode ? "text-zinc-100" : "text-zinc-800"
              }`}>
                Administrar días festivos
              </h3>
            </div>

            {/* Form to Add Holiday */}
            <form onSubmit={handleCreateHoliday} className={`space-y-3 p-3 rounded-lg border text-left ${
              isDarkMode 
                ? "bg-zinc-950 border-zinc-900" 
                : "bg-slate-50 border-slate-200/60"
            }`}>
              <span className={`block text-[10px] font-mono select-none font-bold uppercase ${
                isDarkMode ? "text-zinc-500" : "text-zinc-400"
              }`}>
                Agregar Nuevo Día Festivo
              </span>

              {holidayError && (
                <div className={
                  "p-2.5 border rounded text-[10px] font-sans flex items-start gap-1 " +
                  (isDarkMode 
                    ? "bg-red-950/40 border-red-500/20 text-red-300"
                    : "bg-red-50 border-red-200 text-red-700")
                }>
                  <AlertTriangle size={12} className={isDarkMode ? "text-red-500 shrink-0 mt-0.5" : "text-red-600 shrink-0 mt-0.5"} />
                  <span>{holidayError}</span>
                </div>
              )}

              {holidaySuccess && (
                <div className={
                  "p-2 border rounded text-[10px] font-sans flex items-center gap-1.5 " +
                  (isDarkMode 
                    ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700")
                }>
                  <CheckCircle size={12} className={isDarkMode ? "text-emerald-500" : "text-emerald-600"} />
                  <span>Festivo creado correctamente.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-mono uppercase ${
                    isDarkMode ? "text-zinc-400" : "text-zinc-500"
                  }`}>Fecha *</label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className={
                      "w-full rounded px-2.5 py-1.5 text-xs focus:outline-none transition " +
                      (isDarkMode 
                        ? "bg-zinc-900 border border-zinc-800 text-white focus:border-purple-505" 
                        : "bg-white border border-slate-200 text-zinc-850 focus:border-purple-505 focus:ring-1 focus:ring-purple-500/20")
                    }
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-mono uppercase ${
                    isDarkMode ? "text-zinc-400" : "text-zinc-500"
                  }`}>Nombre del Festivo *</label>
                  <input
                    type="text"
                    required
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="Navidad, Año Nuevo..."
                    className={
                      "w-full rounded px-2.5 py-1.5 text-xs focus:outline-none transition " +
                      (isDarkMode 
                        ? "bg-zinc-900 border border-zinc-800 text-white focus:border-purple-505" 
                        : "bg-white border border-slate-200 text-zinc-850 focus:border-purple-505 focus:ring-1 focus:ring-purple-500/20")
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting.holiday}
                className={`w-full font-bold uppercase py-1.5 text-[10px] rounded tracking-wide transition flex items-center justify-center gap-1 cursor-pointer ${
                  isDarkMode 
                    ? "bg-purple-600 hover:bg-purple-500 text-white" 
                    : "bg-purple-600 hover:bg-purple-700 text-white font-extrabold"
                }`}
              >
                <Plus size={11} className="stroke-[3]" />
                {isSubmitting.holiday ? "Guardando..." : "Crear Festivo"}
              </button>
            </form>

            {/* List display with scroll */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1 text-left">
              <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? "text-zinc-500" : "text-zinc-400"
              }`}>
                Festivos Activos ({holidays ? holidays.length : 0})
              </span>
              <div className={`space-y-1.5 p-1.5 border rounded-lg ${
                isDarkMode 
                  ? "border-zinc-900 bg-zinc-900/10" 
                  : "border-slate-100 bg-slate-50/50"
              }`}>
                {!holidays || holidays.length === 0 ? (
                  <div className={`text-[10px] font-mono italic p-2 text-center w-full ${
                    isDarkMode ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    No hay festivos creados.
                  </div>
                ) : (
                  [...holidays].sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                    <div 
                      key={h.id}
                      className={`flex items-center justify-between gap-1.5 border text-[10px] font-mono py-1.5 px-3 rounded-lg transition group ${
                        isDarkMode 
                          ? "bg-zinc-950 border-zinc-900 hover:bg-zinc-900" 
                          : "bg-white hover:bg-slate-55 border-slate-205 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-bold ${isDarkMode ? "text-zinc-300" : "text-zinc-800"}`}>
                          {h.name}
                        </span>
                        <span className={`text-[9px] ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                          {h.date}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Seguro que deseas eliminar el festivo "${h.name}"?`)) {
                            onDeleteHoliday(h.id);
                          }
                        }}
                        className={`font-bold transition font-sans cursor-pointer text-xs ml-1 ${
                          isDarkMode ? "text-zinc-500 hover:text-red-400" : "text-zinc-400 hover:text-red-500"
                        }`}
                        title={`Eliminar festivo ${h.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
