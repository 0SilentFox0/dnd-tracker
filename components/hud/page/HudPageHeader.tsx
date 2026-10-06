import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HudPageHeader({ title, subtitle, actions, children, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn("space-y-3 rounded-xl border border-[#3a2e22] bg-[rgba(17,14,11,.85)] p-3 backdrop-blur-[2px] sm:p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="hud-sc text-xl text-[#efe5d2]">{title}</h1>
          {subtitle && <p className="text-sm text-[#8f8473]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
