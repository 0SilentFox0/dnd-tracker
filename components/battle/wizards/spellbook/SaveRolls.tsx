import { useTranslations } from "next-intl";

import { DieInput } from "@/components/battle/hud/DiceInput";
import type { BattleParticipant } from "@/types/battle";

export function SaveRolls({ targets, saves, onChange, title }: { targets: BattleParticipant[]; saves: Record<string, number>; onChange: (id: string, value: number | undefined) => void; title?: string }) {
  const tw = useTranslations("battleWizards.spell");

  const label = title ?? tw("saveRoll");

  return targets.map((t) => {
    const id = t.basicInfo.id;

    return (
      <label key={id} className="mt-3 flex items-center justify-between gap-3 text-sm">
        {label} · {t.basicInfo.name}
        <DieInput label={`${label}: ${t.basicInfo.name}`} sides={20} value={saves[id]} onChange={(v) => onChange(id, v)} className="h-10 w-16 border border-white/20 bg-black/30 text-center text-[var(--ink)]" />
      </label>
    );
  });
}
