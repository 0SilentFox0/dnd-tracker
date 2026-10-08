"use client";

import { SkillSpellSelector } from "./SkillSpellSelector";

import { HudSection } from "@/components/hud/form";

interface SpellOption {
  id: string;
  name: string;
}

interface SkillSpellSectionProps {
  spell: {
    spellId: string | null;
    grantedSpellId: string | null;
    setters: {
      setSpellId: (value: string | null) => void;
      setGrantedSpellId: (value: string | null) => void;
    };
  };
  spells: SpellOption[];
}

export function SkillSpellSection({ spell, spells }: SkillSpellSectionProps) {
  const { spellId, grantedSpellId, setters } = spell;

  return (
    <HudSection title="Заклинання">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SkillSpellSelector spellId={spellId} spells={spells} onSpellIdChange={setters.setSpellId} label="Пов'язане заклинання" placeholder="Не обрано" noneLabel="Не обрано" />
          <SkillSpellSelector id="skill-granted-spell" spellId={grantedSpellId} spells={spells} onSpellIdChange={setters.setGrantedSpellId} label="Дає заклинання" placeholder="Не дає заклинання" noneLabel="Не дає заклинання" />
        </div>
        <p className="text-xs text-muted-foreground">
          «Дає заклинання» — герой, що вивчив цей скіл, отримує заклинання в книгу. Розширення цілей заклинань (область, усі) задаються вмінням «Цілі заклинань».
        </p>
      </div>
    </HudSection>
  );
}
