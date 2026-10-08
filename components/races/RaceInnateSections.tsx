"use client";

import { EntityIcon } from "@/components/common/EntityIcon";
import { useRacialSkills } from "@/lib/hooks/skills";
import type { RacePassiveAbility } from "@/lib/utils/races/race-summary";
import type { RacialSkillView } from "@/lib/utils/races/racial-skills";

const LEVEL_LABEL: Record<RacialSkillView["level"], string> = { basic: "Базовий", advanced: "Просунутий", expert: "Експерт", ultimate: "Ультимейт" };

function Described({ title, tag, icon, description, appearance }: { title: string; tag?: string; icon?: string | null; description?: string; appearance?: string }) {
  return (
    <div className="space-y-1 rounded-md bg-hud-field px-2.5 py-2">
      <div className="flex items-center gap-2">
        {icon && <EntityIcon src={icon} name={title} size={32} className="size-8 shrink-0 rounded-md border border-hud-line" />}
        <p className="text-sm font-medium text-hud-ink">
          {title}
          {tag && <span className="ml-2 text-xs font-normal text-muted-foreground">{tag}</span>}
        </p>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-hud-bone">Що робить: </span>
          {description}
        </p>
      )}
      {appearance && (
        <p className="text-sm italic text-muted-foreground">
          <span className="font-medium not-italic text-hud-bone">Як це виглядає: </span>
          {appearance}
        </p>
      )}
    </div>
  );
}

export function RacePassiveBlock({ passive }: { passive: RacePassiveAbility }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Вроджена пасивка:</p>
      <Described title={passive.name ?? "Пасивна здібність"} icon={passive.icon} description={passive.description} appearance={passive.appearanceDescription} />
    </div>
  );
}

export function RacialSkillsBlock({ campaignId, raceName }: { campaignId: string; raceName: string }) {
  const { levels, ultimate } = useRacialSkills(campaignId, raceName);

  const all = [...levels, ...(ultimate ? [ultimate] : [])];

  if (all.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Расові навики:</p>
      {all.map((skill) => (
        <Described key={skill.id} title={skill.name} tag={LEVEL_LABEL[skill.level]} description={skill.description} appearance={skill.appearanceDescription} />
      ))}
    </div>
  );
}
