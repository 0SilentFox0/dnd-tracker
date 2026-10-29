import { useState } from "react";
import { useTranslations } from "next-intl";

import { useAbilityText } from "@/components/abilities/use-ability-text";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";
import { useText } from "@/lib/i18n/use-text";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { ProgressionNode } from "@/lib/utils/skills/progression";
import { nodeLabel } from "@/lib/utils/skills/progression/labels";
import type { CharacterProgressionDto } from "@/types/progression";

export function OfferList({ offers, dto, filter, onClearFilter, onSelect }: { offers: ProgressionNode[]; dto: CharacterProgressionDto; filter: { label: string; match: (n: ProgressionNode) => boolean } | null; onClearFilter: () => void; onSelect: (node: ProgressionNode) => void }) {
  const t = useTranslations("skillTree.offers");

  const text = useText();

  const tr = useTranslator("skillTree");

  const abilityText = useAbilityText();

  const [expanded, setExpanded] = useState(false);

  const list = filter ? offers.filter(filter.match) : offers;

  const shown = expanded || filter ? list : list.slice(0, 3);

  return (
    <section id="progression-offers" className="pb-2">
      <h3 className="hud-sc mx-4 mb-1.5 mt-3.5 text-[13px] uppercase tracking-[.12em] text-hud-muted">{t("heading")}</h3>
      {filter && (
        <Button type="button" variant="ghost" size="sm" onClick={onClearFilter} className="mx-4 mb-2 h-auto rounded-full border border-[#4a4036] px-3 py-1 text-xs text-[#d6cbb7]">
          {filter.label} ✕
        </Button>
      )}
      <ul aria-label={t("listLabel")} className="flex flex-col gap-2 px-4">
        {shown.map((node, i) => {
          const { title, tag } = nodeLabel(node, dto, tr);

          const skill = node.skillId ? dto.skills[node.skillId] : undefined;

          const icon = skill?.icon ?? ("branchId" in node ? dto.branches[node.branchId]?.icon : null) ?? null;

          return (
            <li key={node.nodeId}>
              <Button type="button" variant="ghost" onClick={() => onSelect(node)} className={`offer-card h-auto whitespace-normal rounded-none p-0 font-normal hover:bg-transparent dark:hover:bg-transparent justify-start text-left ${i === 0 && !filter ? "top" : ""}`}>
                <span className="skill-slot learned" style={{ width: 48, height: 48 }}>
                  {icon ? <OptimizedImage src={icon} alt="" width={48} height={48} className="h-full w-full object-cover" fallback={<span className="hud-sc">{title[0]}</span>} /> : <span className="hud-sc">{title[0]}</span>}
                </span>
                <span className="min-w-0 text-left">
                  <span className="hud-sc block text-base text-hud-ink">{title}</span>
                  <span className="block text-xs text-hud-gold">{tag}</span>
                  {skill?.summary[0] && <span className="mt-1 block text-[13px] leading-snug text-[#b8ab95]">{abilityText.flowsText(skill.summary)}</span>}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
      {!filter && !expanded && list.length > 3 && (
        <Button type="button" variant="link" size="sm" onClick={() => setExpanded(true)} className="mx-4 mt-2 h-auto p-0 text-xs text-hud-muted">
          {t("more", { count: list.length - 3 })} ▾
        </Button>
      )}
    </section>
  );
}
