import React, { useState, useEffect, useRef } from "react";
import { type Task, type Vacation, type TeamMember, type RouteCity, type Role, type TagType } from "./types";
import KanbanBoard from "./components/KanbanBoard";
import GanttTimeline from "./components/GanttTimeline";
import VacationMatrix from "./components/VacationMatrix";
import ControlPanel from "./components/ControlPanel";
import LoginScreen from "./components/LoginScreen";
import { Database, Calendar, ClipboardList, ShieldAlert, Sliders, Menu, X, Sun, Moon } from "lucide-react";
import { initAuth, googleSignIn, logout, checkEmailAuthorized } from "./lib/firebase";
import {
  seedDefaultData,
  subscribeToAll,
  checkVacationConflict,
  addTask, updateTask, deleteTask,
  addVacation, updateVacation, deleteVacation,
  addTeamMember, deleteTeamMember,
  addRouteCity, deleteRouteCity,
  addTag, deleteTag,
} from "./lib/firestoreDb";

export default function App() {
  const [activeTab, setActiveTab] = useState<"kanban" | "timeline" | "vacations" | "control">("kanban");
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || !saved; // default to true (dark) if not set, or let's allow easy toggle
  });

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // App states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [routeCities, setRouteCities] = useState<RouteCity[]>([]);
  const [tagsBank, setTagsBank] = useState<TagType[]>([]);
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string>("e_pablo");

  // System states
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const unsubscribeFirestoreRef = useRef<(() => void) | null>(null);

  // Access control state for parameters/admin tab
  const [isAdminProtected, setIsAdminProtected] = useState<boolean>(() => {
    return localStorage.getItem("level_up_admin_protected") === "true";
  });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  const handleSetAdminProtected = (val: boolean) => {
    setIsAdminProtected(val);
    localStorage.setItem("level_up_admin_protected", val ? "true" : "false");
    if (!val) setIsAdminUnlocked(false);
  };

  // Connect to Firestore real-time subscriptions
  const connectFirestore = async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      await seedDefaultData();
      if (unsubscribeFirestoreRef.current) unsubscribeFirestoreRef.current();
      const unsub = subscribeToAll({
        onTasks: setTasks,
        onVacations: setVacations,
        onTeamMembers: setTeamMembers,
        onRouteCities: setRouteCities,
        onTagsBank: setTagsBank,
      });
      unsubscribeFirestoreRef.current = unsub;
      setServerStatus("connected");
    } catch (err: any) {
      console.error(err);
      setServerStatus("disconnected");
      setErrorBanner("Error al conectar con Firestore: " + (err.message || "Error desconocido"));
    } finally {
      setIsLoading(false);
    }
  };

  // Kept as alias for error banner retry button
  const loadSystemData = connectFirestore;

  useEffect(() => {
    const unsub = initAuth(
      async (user) => {
        // Validate that the user's email is registered in teamMembers
        if (user.email) {
          const isAuthorized = await checkEmailAuthorized(user.email);
          if (!isAuthorized) {
            setAccessDeniedMessage(
              `El email "${user.email}" no está autorizado. Pide a un administrador que te dé de alta.`
            );
            await logout();
            return;
          }
        }
        setAccessDeniedMessage(null);
        setFirebaseUser(user);
        await connectFirestore();
      },
      () => {
        setFirebaseUser(null);
        setServerStatus("disconnected");
        setIsLoading(false);
        if (unsubscribeFirestoreRef.current) {
          unsubscribeFirestoreRef.current();
          unsubscribeFirestoreRef.current = null;
        }
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (firebaseUser?.email && teamMembers.length > 0) {
      const match = teamMembers.find(
        m => m.email?.toLowerCase() === firebaseUser.email.toLowerCase()
      );
      if (match) setCurrentUserMemberId(match.id);
    }
  }, [firebaseUser, teamMembers]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
    }
  }, [isDarkMode]);

  // Login with Google (Firebase Auth only) + email validation
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAccessDeniedMessage(null);
    try {
      const user = await googleSignIn();
      // The initAuth listener will validate the email and handle the rest
      if (!user?.email) {
        setAccessDeniedMessage("No se pudo obtener el email de la cuenta de Google.");
      }
    } catch (err: any) {
      console.error(err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setAccessDeniedMessage(`Error al iniciar sesión: ${err?.message || err}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Logout
  const handleSignOut = async () => {
    if (!window.confirm("¿Cerrar sesión?")) return;
    await logout();
  };

  // --- Task handlers (Firestore) ---
  const handleAddTask = async (newTaskData: Omit<Task, "id">): Promise<{ success: boolean; message?: string }> => {
    try {
      const uuiv4 = crypto.randomUUID();
      const payload: Task = {
        ...newTaskData,
        id: uuiv4,
      };

      // Conflict validation (always runs)
      const conflict = checkVacationConflict(payload.assignedPair, payload.dueDate, vacations, teamMembers);
      if (conflict.hasConflict) {
        return { success: false, message: conflict.message };
      }

      await addTask(payload);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al guardar tarea en Firestore: " + (err.message || err) };
    }
  };

  const handleUpdateTask = async (updatedTask: Task): Promise<{ success: boolean; message?: string }> => {
    try {
      const conflict = checkVacationConflict(updatedTask.assignedPair, updatedTask.dueDate, vacations, teamMembers);
      if (conflict.hasConflict) return { success: false, message: conflict.message };
      await updateTask(updatedTask);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al actualizar tarea: " + (err.message || err) };
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (err: any) {
      alert("Error al eliminar tarea: " + (err.message || err));
    }
  };

  // --- Vacation handlers (Firestore) ---
  const handleAddVacation = async (newVacData: Omit<Vacation, "id">): Promise<{ success: boolean; message?: string }> => {
    try {
      const payload: Vacation = { ...newVacData, id: crypto.randomUUID() };
      await addVacation(payload);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al guardar vacación: " + (err.message || err) };
    }
  };

  const handleUpdateVacation = async (updatedVac: Vacation): Promise<{ success: boolean; message?: string }> => {
    try {
      await updateVacation(updatedVac);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al actualizar vacación: " + (err.message || err) };
    }
  };

  const handleDeleteVacation = async (id: string) => {
    try {
      await deleteVacation(id);
    } catch (err: any) {
      alert("Error al eliminar vacación: " + (err.message || err));
    }
  };

  // --- Team Members handlers (Firestore) ---
  const handleAddTeamMember = async (member: { id: string; name: string; role: Role; email?: string; allowedViews?: string[] }) => {
    try {
      if (teamMembers.some(m => m.id === member.id)) {
        return { success: false, message: "Un usuario con este ID ya existe." };
      }
      const newMember: TeamMember = {
        id: member.id,
        name: member.name,
        role: member.role,
        email: member.email || `${member.id}@levelupdesarrollo.com`,
        allowedViews: member.allowedViews || ["tasks"],
      };
      await addTeamMember(newMember);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al añadir miembro: " + (err.message || err) };
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    try {
      await deleteTeamMember(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al eliminar miembro: " + (err.message || err) };
    }
  };

  // --- Route Cities handlers (Firestore) ---
  const handleAddRouteCity = async (city: { id: string; name: string; region: string }) => {
    try {
      if (routeCities.some(c => c.id === city.id)) {
        return { success: false, message: "Ya existe una ciudad con ese ID." };
      }
      await addRouteCity(city);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al añadir ciudad: " + (err.message || err) };
    }
  };

  const handleDeleteRouteCity = async (id: string) => {
    try {
      await deleteRouteCity(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al eliminar ciudad: " + (err.message || err) };
    }
  };

  // --- Tags Bank handlers (Firestore) ---
  const handleAddTag = async (tag: string, color?: string) => {
    try {
      const normalized = tag.trim().toUpperCase();
      if (!normalized) return { success: false, message: "La etiqueta no puede estar vacía." };
      if (tagsBank.some(t => t.name === normalized)) return { success: false, message: "Esta etiqueta ya existe." };
      await addTag({ name: normalized, color: color || "#3b82f6" });
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al añadir etiqueta: " + (err.message || err) };
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      await deleteTag(tagName.toUpperCase());
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Error al eliminar etiqueta: " + (err.message || err) };
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  // If not logged in, show LoginScreen
  if (!firebaseUser) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        accessDeniedMessage={accessDeniedMessage}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans select-none antialiased selection:bg-cyan-500 selection:text-black transition-colors duration-250 ${
      isDarkMode ? "bg-[#050505] text-zinc-100" : "bg-slate-50 text-zinc-800 light-theme"
    }`}>
      {/* Upper high-fidelity telemetry header bar */}
      <header className={`border-b backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-40 ${
        isDarkMode 
          ? "border-zinc-900 bg-zinc-950/80 text-white" 
          : "border-zinc-200 bg-white/95 text-zinc-800 shadow-sm"
      }`}>
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu trigger button (visible on mobile only) */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className={`md:hidden p-2 rounded-lg border transition-all cursor-pointer ${
              isDarkMode 
                ? "bg-zinc-900/60 border-zinc-800 text-zinc-305 hover:bg-zinc-800 hover:text-white" 
                : "bg-slate-50 border-zinc-200 text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
            }`}
            title="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>

          <div className={`border p-1.5 rounded-xl flex items-center justify-center w-11 h-11 overflow-hidden shadow-sm ${
            isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-zinc-200"
          }`}>
            <img 
              src="https://lh3.googleusercontent.com/d/1BDBW61vtpPFGTorfqm4d861to0GH7Sfa" 
              alt="Logo Equipo Expansión" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className={`text-sm font-black font-mono tracking-wider uppercase ${
              isDarkMode ? "text-white" : "text-zinc-950"
            }`}>
              EQUIPO EXPANSIÓN
            </span>
          </div>
        </div>

        {/* Sync status light and Firebase/Google user bubble */}
        <div className="flex items-center gap-3.5 flex-wrap">

          {/* Sync status light - Compact disc & light only as requested */}
          <div 
            className={`relative p-2.5 rounded-xl border flex items-center justify-center w-10 h-10 shrink-0 ${
              isDarkMode ? "bg-zinc-900/40 border-zinc-900 text-zinc-400" : "bg-slate-50 border-zinc-200 text-zinc-650 shadow-sm"
            }`}
            title={serverStatus === "connected" ? "Bunker de datos Conectado" : "Bunker de datos Sin Conexión"}
          >
            <Database size={15} />
            <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 ${
              isDarkMode ? "border-zinc-950" : "border-white"
            } ${
              serverStatus === "connected" ? "bg-lime-500 animate-pulse shadow-[0_0_8px_#55ff00]" : "bg-red-500"
            }`} />
          </div>

          {/* Light/Dark Theme Switcher Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors flex items-center justify-center cursor-pointer shadow-sm w-10 h-10 shrink-0 ${
              isDarkMode 
                ? "bg-zinc-900/60 hover:bg-zinc-800 border-zinc-805 text-zinc-300" 
                : "bg-slate-50 hover:bg-slate-100 border-zinc-205 text-zinc-650"
            }`}
            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          >
            {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
          </button>

          {/* Firebase Auth User bubble / Sign-in button */}
          {firebaseUser ? (
            <div className="relative group">
              <button 
                className={`relative w-10 h-10 rounded-full border-2 overflow-hidden shadow-sm hover:ring-2 hover:ring-cyan-500 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isDarkMode ? "border-emerald-500" : "border-emerald-600"
                }`}
                title="Sesión activa"
              >
                {firebaseUser.photoURL ? (
                  <img src={firebaseUser.photoURL} alt={firebaseUser.displayName || "Usuario"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-cyan-500 via-sky-450 to-emerald-400 text-black font-semibold text-[11px] flex items-center justify-center">
                    {firebaseUser.displayName ? firebaseUser.displayName.split(" ").map((n: string) => n[0]).join("") : "U"}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full animate-pulse" />
              </button>
              
              {/* Floating dropdown */}
              <div className={`absolute right-0 mt-2 w-60 border rounded-xl shadow-xl p-4 hidden group-hover:block hover:block z-50 text-left space-y-3 ${
                isDarkMode ? "bg-zinc-950 border-zinc-900 shadow-black/80" : "bg-white border-zinc-200 shadow-zinc-200/50"
              }`}>
                <div className="flex items-center gap-2.5">
                  {firebaseUser.photoURL ? (
                    <img src={firebaseUser.photoURL} alt="" className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 font-bold text-xs flex items-center justify-center">
                      {firebaseUser.displayName ? firebaseUser.displayName.split(" ").map((n: string) => n[0]).join("") : "U"}
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className={`text-xs font-bold leading-tight ${isDarkMode ? "text-zinc-100" : "text-zinc-800"}`}>
                      {firebaseUser.displayName || "Usuario"}
                    </span>
                    <span className={`text-[10px] font-mono truncate max-w-[150px] ${isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                      {firebaseUser.email}
                    </span>
                  </div>
                </div>
                <div className={`border-t pt-2.5 space-y-1.5 ${isDarkMode ? "border-zinc-900" : "border-zinc-150"}`}>
                  <div className={`text-[9px] font-mono uppercase tracking-wider pb-1 ${ isDarkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                    🔥 Firebase Firestore — Datos en tiempo real
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isDarkMode ? "text-red-400 bg-red-950/20 border-red-950/40 hover:bg-red-900/30" : "text-red-700 bg-red-50 border-red-200 hover:bg-red-100/60"
                    }`}
                  >
                    <span>Cerrar sesión</span>
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-sm shrink-0 hover:scale-[1.02] ${
                isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-cyan-500" : "bg-white border-zinc-300 hover:border-cyan-500"
              }`}
              title="Iniciar sesión con Google"
            >
              {isSigningIn ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-cyan-500 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
            </button>
          )}

        </div>

      </header>

      {/* Collapsible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Background backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Slider Drawer panel */}
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full bg-zinc-950 border-r border-zinc-900 p-6 space-y-6 shadow-2xl z-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                Menú Navegación
              </span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 py-2 border-b border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://lh3.googleusercontent.com/d/1BDBW61vtpPFGTorfqm4d861to0GH7Sfa" 
                  alt="Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xs font-black font-mono tracking-wider text-white">
                EQUIPO EXPANSIÓN
              </span>
            </div>

            <nav className="flex flex-col gap-2 font-mono text-xs">
              <button
                onClick={() => { setActiveTab("kanban"); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold tracking-wider uppercase transition border text-left ${
                  activeTab === "kanban"
                    ? "border-cyan-500 bg-cyan-950/20 text-cyan-455"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                } cursor-pointer`}
              >
                <ClipboardList size={15} />
                Tablón de Tareas
              </button>

              <button
                onClick={() => { setActiveTab("timeline"); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold tracking-wider uppercase transition border text-left ${
                  activeTab === "timeline"
                    ? "border-lime-500 bg-lime-950/20 text-lime-455"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                } cursor-pointer`}
              >
                <Calendar size={15} />
                Calendario
              </button>

              <button
                onClick={() => { setActiveTab("vacations"); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold tracking-wider uppercase transition border text-left ${
                  activeTab === "vacations"
                    ? "border-amber-500 bg-amber-950/20 text-amber-455"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                } cursor-pointer`}
              >
                <Database size={15} />
                Vacaciones
              </button>

              <button
                onClick={() => { setActiveTab("control"); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold tracking-wider uppercase transition border text-left ${
                  activeTab === "control"
                    ? "border-purple-500 bg-purple-950/20 text-purple-455"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                } cursor-pointer`}
              >
                <Sliders size={15} />
                Administrador
              </button>
            </nav>

            <div className="pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono">
              USUARIO ACTUAL
              <div className="text-zinc-300 font-bold mt-1 text-xs">
                {teamMembers.find(m => m.id === currentUserMemberId)?.name || "Pablo Miralles"}
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Critical System Banner if disconnected */}
      {errorBanner && (
        <div className="bg-red-950/40 border-b border-red-500/25 p-4 text-center text-xs text-red-200 flex items-center justify-center gap-2.5">
          <ShieldAlert size={16} className="text-red-500 animate-bounce" />
          <span className="font-mono uppercase font-bold text-[10px] tracking-wider bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded text-red-400">
            FALLO DE RED
          </span>
          <p className="font-medium">{errorBanner}</p>
          <button 
            onClick={loadSystemData} 
            className="text-xs underline hover:text-white cursor-pointer ml-2"
          >
            Reintentar enlace
          </button>
        </div>
      )}

      {/* Primary body view content grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Interactive View tab controllers */}
        <div className={`hidden md:flex border-b pb-px ${
          isDarkMode ? "border-zinc-900" : "border-zinc-200"
        }`}>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            
            <button
              id="tab-kanban"
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider uppercase transition rounded-t-lg border-t-2 ${
                activeTab === "kanban"
                  ? isDarkMode
                    ? "border-cyan-500 bg-zinc-950 text-white"
                    : "border-cyan-500 bg-white text-zinc-800 shadow-sm border-x border-b-white border-zinc-200"
                  : isDarkMode
                    ? "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/30"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-slate-100"
              } cursor-pointer`}
            >
              <ClipboardList size={14} />
              Tablón de Tareas
            </button>

            <button
              id="tab-timeline"
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider uppercase transition rounded-t-lg border-t-2 ${
                activeTab === "timeline"
                  ? isDarkMode
                    ? "border-lime-500 bg-zinc-950 text-white"
                    : "border-lime-500 bg-white text-zinc-800 shadow-sm border-x border-b-white border-zinc-200"
                  : isDarkMode
                    ? "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/30"
                    : "border-transparent text-zinc-500 hover:text-zinc-805 hover:bg-slate-100"
              } cursor-pointer`}
            >
              <Calendar size={14} />
              Calendario
            </button>

            <button
              id="tab-vacations"
              onClick={() => setActiveTab("vacations")}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider uppercase transition rounded-t-lg border-t-2 ${
                activeTab === "vacations"
                  ? isDarkMode
                    ? "border-amber-500 bg-zinc-950 text-white"
                    : "border-amber-500 bg-white text-zinc-800 shadow-sm border-x border-b-white border-zinc-200"
                  : isDarkMode
                    ? "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/30"
                    : "border-transparent text-zinc-500 hover:text-zinc-850 hover:bg-slate-100"
              } cursor-pointer`}
            >
              <Database size={14} />
              Vacaciones del Equipo
            </button>

            <button
              id="tab-control"
              onClick={() => setActiveTab("control")}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold tracking-wider uppercase transition rounded-t-lg border-t-2 ${
                activeTab === "control"
                  ? isDarkMode
                    ? "border-purple-500 bg-zinc-950 text-white"
                    : "border-purple-500 bg-white text-zinc-800 shadow-sm border-x border-b-white border-zinc-200"
                  : isDarkMode
                    ? "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/30"
                    : "border-transparent text-zinc-500 hover:text-zinc-850 hover:bg-slate-100"
              } cursor-pointer`}
            >
              <Sliders size={14} />
              Administrador
            </button>

          </div>
        </div>

        {/* Loading Spinner canvas */}
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 rounded-full border-t-2 border-cyan-500 animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Conectando con el servidor...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* View Switching */}
            {activeTab === "kanban" && (
              <KanbanBoard
                tasks={tasks}
                teamMembers={teamMembers}
                routeCities={routeCities}
                tagsBank={tagsBank}
                isDarkMode={isDarkMode}
                currentUserMemberId={currentUserMemberId}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === "timeline" && (
              <GanttTimeline
                tasks={tasks}
                routeCities={routeCities}
                teamMembers={teamMembers}
                vacations={vacations}
                tagsBank={tagsBank}
                onAddTask={handleAddTask}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === "vacations" && (
              <VacationMatrix
                vacations={vacations}
                teamMembers={teamMembers}
                onAddVacation={handleAddVacation}
                onUpdateVacation={handleUpdateVacation}
                onDeleteVacation={handleDeleteVacation}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === "control" && isAdminProtected && !isAdminUnlocked ? (
              <div className={`max-w-md mx-auto my-12 border rounded-xl p-6 space-y-5 text-center shadow-2xl ${
                isDarkMode 
                  ? "bg-zinc-950 border-zinc-900 shadow-black/40 text-left" 
                  : "bg-white border-zinc-200 shadow-lg text-left"
              }`}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                  isDarkMode 
                    ? "bg-purple-950/40 border border-purple-500/30 text-purple-400" 
                    : "bg-purple-50 border border-purple-200 text-purple-600"
                }`}>
                  <Sliders size={20} className="stroke-[2]" />
                </div>
                <div className="text-center">
                  <h3 className={`text-sm font-bold uppercase tracking-tight ${
                    isDarkMode ? "text-white" : "text-zinc-900"
                  }`}>Acceso de Oficina Requerido</h3>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                    Esta pestaña de Administrador está protegida. Introduce el código de acceso para continuar.
                  </p>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (adminPasswordInput.toLowerCase() === "levelup") {
                      setIsAdminUnlocked(true);
                      setAdminPasswordError(null);
                    } else {
                      setAdminPasswordError("Código de acceso incorrecto.");
                    }
                  }}
                  className="space-y-3 text-left"
                >
                  <div className="space-y-1">
                    <label className={`block text-[10px] font-mono uppercase tracking-widest ${
                      isDarkMode ? "text-zinc-500" : "text-zinc-400"
                    }`}>Código de Acceso Corporativo</label>
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="Introduce la contraseña"
                      className={`w-full rounded px-3 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono ${
                        isDarkMode 
                          ? "bg-zinc-900 border border-zinc-800 text-white focus:border-purple-500" 
                          : "bg-slate-50 border border-zinc-300 text-zinc-800 focus:border-purple-500"
                      }`}
                    />
                  </div>
                  {adminPasswordError && (
                    <p className="text-[10px] text-red-500 font-mono text-center">{adminPasswordError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs uppercase tracking-wide transition cursor-pointer shadow-sm"
                  >
                    Confirmar Contraseña
                  </button>
                  <p className="text-[10px] font-mono text-center text-zinc-500">
                    Contraseña predeterminada de prueba: <code className="text-zinc-500 font-bold bg-zinc-900/60 dark:bg-zinc-900 px-1 py-0.5 rounded">levelup</code>
                  </p>
                </form>
              </div>
            ) : (
              activeTab === "control" && (
                <ControlPanel
                  teamMembers={teamMembers}
                  tagsBank={tagsBank}
                  onAddTeamMember={handleAddTeamMember}
                  onDeleteTeamMember={handleDeleteTeamMember}
                  onAddTag={handleAddTag}
                  onDeleteTag={handleDeleteTag}
                  isAdminProtected={isAdminProtected}
                  onSetAdminProtected={handleSetAdminProtected}
                  isDarkMode={isDarkMode}
                />
              )
            )}

          </div>
        )}

      </main>

      {/* Humble Footer containing info guidelines */}
      <footer className="border-t border-zinc-950 py-4 text-center font-mono text-[9px] text-zinc-650 uppercase tracking-widest bg-zinc-950/30 text-zinc-600">
        EQUIPO EXPANSIÓN · Copia de seguridad y sincronización automática
      </footer>

    </div>
  );
}
