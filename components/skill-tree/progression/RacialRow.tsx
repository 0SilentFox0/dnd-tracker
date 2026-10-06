import { SlotButton } from "./SlotButton";

import type { NodeState, TreeNodes } from "@/lib/utils/skills/progression";
import { BRANCH_LEVEL_LABEL, BRANCH_LEVELS, RACIAL_MIN_LEVEL } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function RacialRow({ states, tree, dto, onSelect }: { states: NodeState[]; tree: TreeNodes; dto: CharacterProgressionDto; onSelect: (state: NodeState) => void }) {
  return (
    <div role="group" aria-label={`Раса · ${dto.race}`} className="flex items-center gap-2 border-b border-[rgba(230,220,203,.07)] px-3 py-2 sm:px-4">
      <div className="metal-iron flex w-14 shrink-0 flex-col items-center gap-1">
        <span className="branch-frame hud-sc text-lg">{dto.race[0] ?? "?"}</span>
        <span className="hud-sc text-[11px] text-[var(--m2)]">Раса</span>
      </div>
      <span aria-hidden className="hidden text-[#6b5f50] sm:inline">▸</span>
      <div className="flex">
        {states.map((state, i) => {
          const level = BRANCH_LEVELS[i];

          const skillId = state.nodeId ? tree.nodes.get(state.nodeId)?.skillId : null;

          const skill = skillId ? dto.skills[skillId] : undefined;

          return (
            <div key={level} className="flex flex-col items-center">
              <SlotButton state={state} label={skill?.name ?? `Расове · ${BRANCH_LEVEL_LABEL[level]}`} icon={skill?.icon ?? null} onSelect={() => onSelect(state)} />
              {state.reason === "racialLevel" && <span className="text-[10px] text-[#8f8473]">рівень {RACIAL_MIN_LEVEL[level]}+</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
