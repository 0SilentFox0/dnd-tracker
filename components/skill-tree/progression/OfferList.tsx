import { useState } from "react";

import { nodeLabel } from "./node-labels";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { ProgressionNode } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function OfferList({ offers, dto, filter, onClearFilter, onSelect }: { offers: ProgressionNode[]; dto: CharacterProgressionDto; filter: { label: string; match: (n: ProgressionNode) => boolean } | null; onClearFilter: () => void; onSelect: (node: ProgressionNode) => void }) {
  const [expanded, setExpanded] = useState(false);

  const list = filter ? offers.filter(filter.match) : offers;

  const shown = expanded || filter ? list : list.slice(0, 3);

  return (
    <section id="progression-offers" className="pb-2">
      <h3 className="hud-sc mx-4 mb-1.5 mt-3.5 text-[13px] uppercase tracking-[.12em] text-[#8f8473]">Вивчити (1 очко)</h3>
      {filter && (
        <button type="button" onClick={onClearFilter} className="mx-4 mb-2 rounded-full border border-[#4a4036] px-3 py-1 text-xs text-[#d6cbb7]">
          {filter.label} ✕
        </button>
      )}
      <ul aria-label="Вивчити" className="flex flex-col gap-2 px-4">
        {shown.map((node, i) => {
          const { title, tag } = nodeLabel(node, dto);

          const skill = node.skillId ? dto.skills[node.skillId] : undefined;

          const icon = skill?.icon ?? ("branchId" in node ? dto.branches[node.branchId]?.icon : null) ?? null;

          return (
            <li key={node.nodeId}>
              <button type="button" onClick={() => onSelect(node)} className={`offer-card ${i === 0 && !filter ? "top" : ""}`}>
                <span className="skill-slot learned" style={{ width: 48, height: 48 }}>
                  {icon ? <OptimizedImage src={icon} alt="" width={48} height={48} className="h-full w-full object-cover" fallback={<span className="hud-sc">{title[0]}</span>} /> : <span className="hud-sc">{title[0]}</span>}
                </span>
                <span className="min-w-0 text-left">
                  <span className="hud-sc block text-base text-[#efe5d2]">{title}</span>
                  <span className="block text-xs text-[#c9b37a]">{tag}</span>
                  {skill?.summary[0] && <span className="mt-1 block text-[13px] leading-snug text-[#b8ab95]">{skill.summary.join(" · ")}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!filter && !expanded && list.length > 3 && (
        <button type="button" onClick={() => setExpanded(true)} className="mx-4 mt-2 text-xs text-[#8f8473]">
          Ще {list.length - 3} варіантів ▾
        </button>
      )}
    </section>
  );
}
