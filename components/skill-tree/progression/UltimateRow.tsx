import { SlotButton } from "./SlotButton";

import type { NodeState } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function UltimateRow({ state, dto, onSelect }: { state: NodeState; dto: CharacterProgressionDto; onSelect: (state: NodeState) => void }) {
  const skill = state.nodeId ? dto.skills[state.nodeId] : undefined;

  return (
    <div role="group" aria-label="Ультимейт" className="flex items-center gap-2 px-3 py-2 sm:px-4">
      <div className="metal-mithril flex w-14 shrink-0 flex-col items-center gap-1">
        <span className="hud-sc text-[11px] text-[var(--m2)]">Ультимейт</span>
      </div>
      <span aria-hidden className="hidden text-[#6b5f50] sm:inline">▸</span>
      <SlotButton state={state} label={skill?.name ?? "Ультимейт"} icon={skill?.icon ?? null} onSelect={() => onSelect(state)} />
    </div>
  );
}
