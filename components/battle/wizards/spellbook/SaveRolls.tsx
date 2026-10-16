import { DieInput } from "@/components/battle/hud/DiceInput";
import type { BattleParticipant } from "@/types/battle";

export function SaveRolls({ targets, saves, onChange }: { targets: BattleParticipant[]; saves: Record<string, number>; onChange: (id: string, value: number | undefined) => void }) {
  return targets.map((t) => {
    const id = t.basicInfo.id;

    return (
      <label key={id} className="mt-3 flex items-center justify-between gap-3 text-sm">
        Рятівний кидок · {t.basicInfo.name}
        <DieInput label={`Рятівний кидок: ${t.basicInfo.name}`} sides={20} value={saves[id]} onChange={(v) => onChange(id, v)} className="h-10 w-16 border border-[#2a2018]/30 bg-transparent text-center" />
      </label>
    );
  });
}
