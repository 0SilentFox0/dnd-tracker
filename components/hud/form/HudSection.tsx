import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HudSection({ title, header, action, children, className }: { title?: ReactNode; header?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-5 first:mt-0", className)}>
      {header ? (
        <div className="mb-1.5">{header}</div>
      ) : (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
