import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";

import type { LegendEntry, LegendKind } from "@/types/scenario";

const LEGEND_SWATCH: Record<LegendKind, CSSProperties> = {
  read: { background: "var(--blood)" },
  choice: { background: "var(--night)" },
  token: { background: "var(--verdigris)" },
  artifact: { background: "var(--gold)" },
  shadow: { background: "var(--shade)" },
  check: { background: "var(--ink-soft)" },
  notes: { background: "var(--margin)", outline: "1px solid var(--rule)" },
};

export function ScenarioLegend({ legend }: { legend: LegendEntry[] }) {
  const t = useTranslations("scenario");

  if (!legend.length) return null;

  return (
    <div className="legend" aria-label={t("legend")}>
      {legend.map((l, i) => (
        <span key={i}>
          <i style={l.color ? { background: l.color } : LEGEND_SWATCH[l.kind]} />
          {l.label}
        </span>
      ))}
    </div>
  );
}
