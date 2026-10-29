import { useTranslations } from "next-intl";

import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { type DamageBreakdownRow } from "@/lib/utils/battle/view/damage-breakdown";
import { getLogEntryDetailItems } from "@/lib/utils/battle/view/log-format";
import type { BattleAction } from "@/types/battle";

function DamageTable({ rows }: { rows: DamageBreakdownRow[] }) {
  const t = useTranslations("battle.log");

  const text = useText();

  return (
    <div className="my-1">
      <div className="text-hud-bone">{t("damage")}</div>
      <dl aria-label={t("damageBreakdown")} className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-px rounded bg-black/25 px-2 py-1">
        {rows.map((r, i) =>
          r.tone === "rule" ? (
            <div key={i} role="separator" className="col-span-2 my-0.5 border-t border-hud-line" />
          ) : (
            <div key={i} className={cn("contents", r.tone === "total" && "font-semibold text-hud-bone")}>
              <dt className={cn("min-w-0", r.tone === "note" && "col-span-2")}>
                {text(r.label)}
                {r.source && <span className="ml-1 text-[10px] text-hud-muted">· {text(r.source)}</span>}
              </dt>
              {r.tone !== "note" && <dd className="text-right tabular-nums">{r.value}</dd>}
            </div>
          ),
        )}
      </dl>
    </div>
  );
}

export function LogEntryDetails({ action }: { action: BattleAction }) {
  const text = useText();

  const items = getLogEntryDetailItems(action);

  if (items.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5 border-l-2 border-hud-line pl-4 text-xs text-[#a89c88]">
      {items.map((item, i) =>
        item.kind === "damage" ? (
          <DamageTable key={i} rows={item.rows} />
        ) : (
          <div key={i}>
            {item.label && <span className="text-hud-bone">{text(item.label)}: </span>}
            {text(item.text)}
          </div>
        ),
      )}
    </div>
  );
}
