import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RollingFieldProps {
  id: string;
  label: string;
  spinning: boolean;
  settled: boolean;
  display: ReactNode;
  children: ReactNode;
  className?: string;
}

export function RollingField({ id, label, spinning, settled, display, children, className }: RollingFieldProps) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div data-settled={settled} data-rolling={spinning} className="hud-roll-field mt-2">
        {spinning ? (
          <div aria-hidden className="hud-roll-display flex h-9 w-full items-center truncate rounded-md border border-input bg-transparent px-3 text-sm">
            {display}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
