import type { CSSProperties, ReactNode } from "react";

import { scenarioFontClassName } from "./fonts";

import "./scenario-book.css";
import { useAiPanelWidth } from "@/lib/hooks/ai";
import { cn } from "@/lib/utils";

export function ScenarioBook({ children, hideNotes = false, theme = null, variant = "page", withAi = false }: { children: ReactNode; hideNotes?: boolean; theme?: "light" | "dark" | null; variant?: "page" | "inline"; withAi?: boolean }) {
  const { width } = useAiPanelWidth();

  return (
    <div style={withAi ? ({ "--ai-panel-w": `${width}px` } as CSSProperties) : undefined} className={cn("scenario-book", scenarioFontClassName, hideNotes && "hide-notes", variant === "inline" && "scenario-book--inline", withAi && "sb-with-ai")} data-theme={theme ?? undefined}>
      {children}
    </div>
  );
}
