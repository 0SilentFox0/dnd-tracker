import type { CSSProperties } from "react";

import type { LegendEntry, LegendKind } from "@/types/scenario";

const SWATCH: Record<LegendKind, CSSProperties> = {
  read: { background: "var(--blood)" },
  choice: { background: "var(--night)" },
  token: { background: "var(--verdigris)" },
  artifact: { background: "var(--gold)" },
  shadow: { background: "var(--shade)" },
  check: { background: "var(--ink-soft)" },
  notes: { background: "var(--margin)", outline: "1px solid var(--rule)" },
};

export function ScenarioLegend({ legend }: { legend: LegendEntry[] }) {
  if (!legend.length) return null;

  return (
    <div className="legend" aria-label="Позначки">
      {legend.map((l, i) => (
        <span key={i}>
          <i style={SWATCH[l.kind]} />
          {l.label}
        </span>
      ))}
    </div>
  );
}
