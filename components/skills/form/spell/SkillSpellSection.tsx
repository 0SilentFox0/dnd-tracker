"use client";

import { SkillSpellSelector } from "./SkillSpellSelector";

import { HudSection } from "@/components/hud/form";
import type { IdName } from "@/types/common";
import type { SkillFormBinding } from "@/types/skills";

export function SkillSpellSection({ form, spells }: { form: SkillFormBinding; spells: IdName[] }) {
  const { data, set } = form;

  return (
    <HudSection title="Заклинання">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SkillSpellSelector spellId={data.spellId} spells={spells} onSpellIdChange={(id) => set("spellId", id)} label="Пов'язане заклинання" placeholder="Не обрано" noneLabel="Не обрано" />
          <SkillSpellSelector id="skill-granted-spell" spellId={data.grantedSpellId} spells={spells} onSpellIdChange={(id) => set("grantedSpellId", id)} label="Дає заклинання" placeholder="Не дає заклинання" noneLabel="Не дає заклинання" />
        </div>
        <p className="text-xs text-muted-foreground">
          «Дає заклинання» — герой, що вивчив цей скіл, отримує заклинання в книгу. Розширення цілей заклинань (область, усі) задаються вмінням «Цілі заклинань».
        </p>
      </div>
    </HudSection>
  );
}
