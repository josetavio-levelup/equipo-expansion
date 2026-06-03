import { type Priority } from "../types";

export default function BadgePriority({ priority }: { priority: Priority }) {
  const configs = {
    LOW: {
      bg: "bg-zinc-900 border-zinc-700/50 text-zinc-400",
      dot: "bg-zinc-400",
      label: "Bajo",
    },
    MEDIUM: {
      bg: "bg-blue-950/40 border-blue-800/30 text-blue-300",
      dot: "bg-blue-400",
      label: "Medio",
    },
    HIGH: {
      bg: "bg-orange-950/40 border-orange-850/30 text-orange-300",
      dot: "bg-orange-400",
      label: "Alto",
    },
    CRITICAL: {
      bg: "bg-[#A3FF00]/10 border-[#A3FF00]/30 text-[#A3FF00] animate-pulse",
      dot: "bg-[#A3FF00]",
      label: "Crítico",
    },
  };

  const config = configs[priority] || configs.LOW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-bold border ${config.bg}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label.toUpperCase()}
    </span>
  );
}
