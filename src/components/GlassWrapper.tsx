import React from "react";

interface GlassWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: "cyan" | "lime" | "gray" | "red";
  className?: string;
}

export default function GlassWrapper({ children, glowColor = "gray", className = "", ...props }: GlassWrapperProps) {
  const glowStyles = {
    cyan: "border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]",
    lime: "border-lime-500/20 shadow-[0_0_20px_rgba(163,255,0,0.05)]",
    red: "border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]",
    gray: "border-white/8 shadow-2xl",
  };

  return (
    <div
      className={`bg-white/[0.02] backdrop-blur-[16px] border rounded-xl p-6 transition-all duration-300 ${glowStyles[glowColor]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
