import React from "react";
import { ShieldAlert, LogIn } from "lucide-react";

interface LoginScreenProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  accessDeniedMessage: string | null;
  isDarkMode: boolean;
}

export default function LoginScreen({
  onSignIn,
  isSigningIn,
  accessDeniedMessage,
  isDarkMode,
}: LoginScreenProps) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 selection:bg-cyan-500 selection:text-black transition-colors duration-300 ${
        isDarkMode ? "bg-[#050505] text-zinc-100" : "bg-slate-50 text-zinc-800"
      }`}
    >
      {/* Background subtle gradient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-20 ${
            isDarkMode
              ? "bg-gradient-to-tr from-cyan-500 via-emerald-500 to-lime-400"
              : "bg-gradient-to-tr from-cyan-300 via-sky-200 to-lime-200"
          }`}
        />
      </div>

      {/* Login card */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-2xl border p-8 space-y-7 text-center shadow-2xl backdrop-blur-sm animate-fade-in ${
          isDarkMode
            ? "bg-zinc-950/80 border-zinc-800/60 shadow-black/50"
            : "bg-white/90 border-zinc-200 shadow-zinc-300/40"
        }`}
        style={{
          animation: "fadeSlideUp 0.5s ease-out both",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl border-2 p-2 flex items-center justify-center overflow-hidden shadow-lg ${
              isDarkMode
                ? "bg-zinc-900 border-zinc-700"
                : "bg-white border-zinc-200"
            }`}
          >
            <img
              src="https://lh3.googleusercontent.com/d/1BDBW61vtpPFGTorfqm4d861to0GH7Sfa"
              alt="Logo Equipo Expansión"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1
              className={`text-lg font-black font-mono tracking-wider uppercase ${
                isDarkMode ? "text-white" : "text-zinc-900"
              }`}
            >
              EQUIPO EXPANSIÓN
            </h1>
            <p
              className={`text-xs font-mono mt-1 ${
                isDarkMode ? "text-zinc-500" : "text-zinc-400"
              }`}
            >
              Panel de Gestión Logística
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className={`border-t ${
            isDarkMode ? "border-zinc-800" : "border-zinc-200"
          }`}
        />

        {/* Access denied error */}
        {accessDeniedMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-left ${
              isDarkMode
                ? "bg-red-950/30 border-red-500/25 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
            style={{ animation: "fadeSlideUp 0.3s ease-out both" }}
          >
            <ShieldAlert
              size={16}
              className={`shrink-0 mt-0.5 ${
                isDarkMode ? "text-red-400" : "text-red-500"
              }`}
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-0.5">
                Acceso Denegado
              </p>
              <p className="text-xs leading-relaxed">{accessDeniedMessage}</p>
            </div>
          </div>
        )}

        {/* Sign in button */}
        <button
          onClick={onSignIn}
          disabled={isSigningIn}
          className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer border shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-wait ${
            isDarkMode
              ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white hover:border-zinc-600"
              : "bg-white hover:bg-slate-50 border-zinc-300 text-zinc-800 hover:border-zinc-400"
          }`}
        >
          {isSigningIn ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-cyan-500 animate-spin" />
              <span className="font-mono text-xs uppercase tracking-wider">
                Verificando acceso...
              </span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>Iniciar sesión con Google</span>
            </>
          )}
        </button>

        {/* Info note */}
        <p
          className={`text-[10px] font-mono leading-relaxed ${
            isDarkMode ? "text-zinc-600" : "text-zinc-400"
          }`}
        >
          🔒 Solo los miembros dados de alta por un administrador pueden
          acceder al sistema.
        </p>
      </div>

      {/* Footer */}
      <p
        className={`relative z-10 mt-8 text-[9px] font-mono uppercase tracking-widest ${
          isDarkMode ? "text-zinc-700" : "text-zinc-400"
        }`}
      >
        EQUIPO EXPANSIÓN · Firebase Auth
      </p>

      {/* Keyframe styles */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
