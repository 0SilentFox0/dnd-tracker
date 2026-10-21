import type { ReactNode } from "react";

import { scenarioFontClassName } from "./fonts";

import "./scenario-book.css";
import { cn } from "@/lib/utils";

export function ScenarioBook({ children, hideNotes = false, theme = null, variant = "page", withAi = false }: { children: ReactNode; hideNotes?: boolean; theme?: "light" | "dark" | null; variant?: "page" | "inline"; withAi?: boolean }) {
  return (
    <div className={cn("scenario-book", scenarioFontClassName, hideNotes && "hide-notes", variant === "inline" && "scenario-book--inline", withAi && "sb-with-ai")} data-theme={theme ?? undefined}>
      {children}
    </div>
  );
}
