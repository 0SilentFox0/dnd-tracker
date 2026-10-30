import type { ReactNode } from "react";

import { FLOW_BORDER, type FlowPart } from "../flow-part";
import { CollapsibleHeader } from "./CollapsibleHeader";

import { cn } from "@/lib/utils";

export const sectionId = (path: string, part: FlowPart) => `${path}-section-${part}`;

interface SectionShellProps {
  path: string;
  part: FlowPart;
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  summary: string | null;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
  children: ReactNode;
}

export function SectionShell({ path, part, title, open, onToggle, summary, onAdd, addLabel, className, children }: SectionShellProps) {
  const id = sectionId(path, part);

  return (
    <div id={id} tabIndex={-1} className={cn("space-y-2 outline-none rounded-sm border-l-2 pl-3", FLOW_BORDER[part], className)}>
      <CollapsibleHeader title={title} summary={summary} open={open} onToggle={onToggle} onAdd={onAdd} addLabel={addLabel} controlsId={`${id}-body`} />
      {open && (
        <div id={`${id}-body`} className="space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
