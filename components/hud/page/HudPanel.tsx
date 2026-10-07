import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HudPanel({ as: Tag = "section", className, children }: { as?: "section" | "div"; className?: string; children: ReactNode }) {
  return <Tag className={cn("rounded-xl border border-hud-rule bg-hud-panel p-3 sm:p-4", className)}>{children}</Tag>;
}
