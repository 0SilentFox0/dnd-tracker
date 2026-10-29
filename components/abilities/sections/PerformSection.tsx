"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor, useErrorsUnder } from "../editor-context";
import { FieldErrors } from "../FieldErrors";
import { SectionTitle } from "./SectionTitle";

// eslint-disable-next-line no-restricted-syntax -- default note text is stored in the ability
const ATTACK_NOTE = "Виконує атаку";

// eslint-disable-next-line no-restricted-syntax -- default note text is stored in the ability
const SPELL_NOTE = "Застосовує заклинання";

export function PerformSection({ ability, path, onChange }: AbilitySectionProps) {
  const t = useTranslations("abilities.perform");

  const { performChoices } = useAbilityEditor();

  const errors = useErrorsUnder(`${path}.perform`);

  if (!ability.limits?.legendaryCost && !ability.limits?.lair) return null;

  const fieldClass = "h-9 rounded-md border border-hud-line bg-hud-field px-2 text-sm";

  const changeKind = (kind: string) => {
    const { perform: _p, ...rest } = ability;

    onChange(kind === "attack" ? { ...rest, perform: { kind, attack: performChoices?.attacks[0]?.name ?? "" }, effects: [{ kind: "note", text: ability.description || ATTACK_NOTE }] } : kind === "spell" ? { ...rest, perform: { kind, spellId: performChoices?.spells[0]?.id ?? "" }, effects: [{ kind: "note", text: ability.description || SPELL_NOTE }] } : rest);
  };

  return (
    <div className="space-y-2">
      <SectionTitle>{t("title")}</SectionTitle>
      <select aria-label={t("kindAria")} className={fieldClass} value={ability.perform?.kind ?? ""} onChange={(e) => changeKind(e.target.value)}>
        <option value="">{t("effects")}</option><option value="attack">{t("attack")}</option><option value="spell">{t("spell")}</option>
      </select>
      {ability.perform?.kind === "attack" && <select aria-label={t("attackAria")} className={fieldClass} value={ability.perform.attack} onChange={(e) => onChange({ ...ability, perform: { kind: "attack", attack: e.target.value } })}>
        <option value="">{t("pickAttack")}</option>{performChoices?.attacks.map((a, i) => <option key={i} value={a.name}>{a.name}</option>)}
      </select>}
      {ability.perform?.kind === "spell" && <select aria-label={t("spellAria")} className={fieldClass} value={ability.perform.spellId} onChange={(e) => onChange({ ...ability, perform: { kind: "spell", spellId: e.target.value } })}>
        <option value="">{t("pickSpell")}</option>{performChoices?.spells.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>}
      <FieldErrors errors={errors} />
    </div>
  );
}
