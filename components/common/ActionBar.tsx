import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "sticky bottom-0 z-10 flex gap-2 border-t bg-background/95 px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur [&>*]:flex-1",
        "sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:pt-4 sm:pb-0 sm:backdrop-blur-none sm:[&>*]:flex-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
