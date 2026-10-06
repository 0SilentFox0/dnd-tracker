import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HudPanel({ as: Tag = "section", className, children }: { as?: "section" | "div"; className?: string; children: ReactNode }) {
  return <Tag className={cn("rounded-xl border border-[#3a2e22] bg-[rgba(17,14,11,.82)] p-3 sm:p-4", className)}>{children}</Tag>;
}
