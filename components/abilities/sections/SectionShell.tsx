import type { ReactNode } from "react";

import { FLOW_BORDER, type FlowPart } from "../flow-part";

import { cn } from "@/lib/utils";

export const sectionId = (path: string, part: FlowPart) => `${path}-section-${part}`;

export function SectionShell({ path, part, className, children }: { path: string; part: FlowPart; className?: string; children: ReactNode }) {
  return (
    <div id={sectionId(path, part)} tabIndex={-1} className={cn("space-y-2 outline-none rounded-sm border-l-2 pl-3", FLOW_BORDER[part], className)}>
      {children}
    </div>
  );
}
