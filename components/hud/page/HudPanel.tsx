import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HudPanel({ as: Tag = "section", className, children, "data-tour": dataTour }: { as?: "section" | "div"; className?: string; children: ReactNode; "data-tour"?: string }) {
  return <Tag className={cn("rounded-xl border border-hud-rule bg-hud-panel p-3 sm:p-4", className)} data-tour={dataTour}>{children}</Tag>;
}
