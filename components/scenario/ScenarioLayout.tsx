import type { ReactNode } from "react";

export function ScenarioLayout({ toc, children }: { toc: ReactNode; children: ReactNode }) {
  return (
    <div className="sb-layout" data-tour="scenario.read">
      {toc}
      <div className="sb-content">{children}</div>
    </div>
  );
}
