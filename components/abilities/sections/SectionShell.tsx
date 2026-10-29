import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionPart = "when" | "if" | "then" | "limits";

const TONE: Record<SectionPart, string> = {
  when: "border-[color:var(--flow-when)]",
  if: "border-[color:var(--flow-if)]",
  then: "border-[color:var(--flow-then)]",
  limits: "border-[color:var(--flow-limit)]",
};

export const sectionId = (path: string, part: SectionPart) => `${path}-section-${part}`;

export function SectionShell({ path, part, className, children }: { path: string; part: SectionPart; className?: string; children: ReactNode }) {
  return (
    <div id={sectionId(path, part)} className={cn("space-y-2 rounded-sm border-l-2 pl-3", TONE[part], className)}>
      {children}
    </div>
  );
}
