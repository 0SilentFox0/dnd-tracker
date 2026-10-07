import { SlotButton } from "./SlotButton";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { BRANCH_LEVEL_METAL } from "@/components/hud";
import { Button } from "@/components/ui/button";
import type { BranchRow as Row, NodeState } from "@/lib/utils/skills/progression";
import { BRANCH_LEVEL_LABEL, branchLevelNodeId } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function BranchRow({ row, dto, onSelect }: { row: Row; dto: CharacterProgressionDto; onSelect: (state: NodeState) => void }) {
  const branch = dto.branches[row.branchId];

  const label = (s: NodeState) => (s.nodeId ? (dto.skills[s.nodeId]?.name ?? "Невідомий скіл") : "Порожній слот");

  const icon = (s: NodeState) => (s.nodeId ? (dto.skills[s.nodeId]?.icon ?? branch?.icon ?? null) : null);

  const levelText = row.level ? BRANCH_LEVEL_LABEL[row.level] : "—";

  const renderSlot = (s: NodeState, i: number) => <SlotButton key={i} state={s} label={label(s)} icon={icon(s)} onSelect={() => onSelect(s)} />;

  return (
    <div role="group" aria-label={`${branch?.name ?? row.branchId} · ${levelText}`} className="flex items-center gap-2 border-b border-[rgba(230,220,203,.07)] px-3 py-2 sm:px-4">
      <Button
        type="button"
        variant="ghost"
        aria-label={`Рівень гілки: ${branch?.name ?? row.branchId} · ${levelText}`}
        disabled={!row.level}
        onClick={() => row.level && onSelect({ nodeId: branchLevelNodeId(row.branchId, row.level), state: "learned" })}
        className={`h-auto whitespace-normal rounded-none p-0 font-normal hover:bg-transparent dark:hover:bg-transparent flex w-14 shrink-0 flex-col items-center gap-1 disabled:opacity-100 ${row.level ? BRANCH_LEVEL_METAL[row.level] : "metal-iron"}`}
      >
        <span className="branch-frame">
          {branch?.icon ? <OptimizedImage src={branch.icon} alt="" width={52} height={52} className="h-full w-full object-cover" fallback={<span className="hud-sc">{branch.name[0]}</span>} /> : <span className="hud-sc text-xl">{branch?.name[0] ?? "?"}</span>}
        </span>
        <span className="hud-sc text-[11px] text-[var(--m2)]">{levelText}</span>
      </Button>
      <span aria-hidden className="hidden text-[#6b5f50] sm:inline">▸</span>
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="flex">{row.outer.map(renderSlot)}</div>
        <div className="flex">{row.middle.map(renderSlot)}</div>
        <div className="flex">{row.inner.map(renderSlot)}</div>
      </div>
    </div>
  );
}
