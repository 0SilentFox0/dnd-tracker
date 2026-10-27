import type { MoneyMode } from "../stash/MoneyDialog";

import { COIN_LABEL, COINS } from "@/lib/constants/inventory";
import type { InventoryModel } from "@/lib/hooks/characters";
import type { Purse } from "@/types/inventory";

const BUTTONS: { mode: MoneyMode; sign: string; label: string; dmOnly?: boolean }[] = [
  { mode: "spend", sign: "−", label: "Витратити" },
  { mode: "gain", sign: "+", label: "Отримати" },
  { mode: "set", sign: "=", label: "Задати суму", dmOnly: true },
];

export function PurseBar({ purse, access, onMode }: { purse: Purse; access: InventoryModel["access"]; onMode: (m: MoneyMode) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-hud-rule bg-hud-field px-3 py-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
      <span className="text-sm text-hud-ink">
        {COINS.map((c) => (
          <span key={c} className="mr-3 whitespace-nowrap last:mr-0">
            {purse[c]} <span className="text-xs text-hud-muted">{COIN_LABEL[c]}</span>
          </span>
        ))}
      </span>
      {access.canAct && (
        <span className="flex gap-1">
          {BUTTONS.filter((b) => !b.dmOnly || access.isDM).map((b) => (
            <button key={b.mode} type="button" aria-label={b.label} title={b.label} onClick={() => onMode(b.mode)} className="flex size-8 items-center justify-center rounded border border-hud-line text-hud-ink hover:border-hud-gold-strong">
              {b.sign}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
