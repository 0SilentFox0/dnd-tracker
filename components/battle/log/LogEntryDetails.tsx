import { cn } from "@/lib/utils";
import { type DamageBreakdownRow } from "@/lib/utils/battle/view/damage-breakdown";
import { getLogEntryDetailItems } from "@/lib/utils/battle/view/log-format";
import type { BattleAction } from "@/types/battle";

function DamageTable({ rows }: { rows: DamageBreakdownRow[] }) {
  return (
    <div className="my-1">
      <div className="text-hud-bone">Урон</div>
      <dl aria-label="Розклад шкоди" className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-px rounded bg-black/25 px-2 py-1">
        {rows.map((r, i) =>
          r.tone === "rule" ? (
            <div key={i} role="separator" className="col-span-2 my-0.5 border-t border-hud-line" />
          ) : (
            <div key={i} className={cn("contents", r.tone === "total" && "font-semibold text-hud-bone")}>
              <dt className={cn("min-w-0", r.tone === "note" && "col-span-2")}>
                {r.label}
                {r.source && <span className="ml-1 text-[10px] text-hud-muted">· {r.source}</span>}
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
  const items = getLogEntryDetailItems(action);

  if (items.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5 border-l-2 border-hud-line pl-4 text-xs text-[#a89c88]">
      {items.map((item, i) =>
        item.kind === "damage" ? (
          <DamageTable key={i} rows={item.rows} />
        ) : (
          <div key={i}>
            {item.label && <span className="text-hud-bone">{item.label}: </span>}
            {item.text}
          </div>
        ),
      )}
    </div>
  );
}
