"use client";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor, useErrorsUnder } from "../editor-context";
import { FieldErrors } from "../FieldErrors";
import { SectionTitle } from "./SectionTitle";

export function PerformSection({ ability, path, onChange }: AbilitySectionProps) {
  const { performChoices } = useAbilityEditor();

  const errors = useErrorsUnder(`${path}.perform`);

  if (!ability.limits?.legendaryCost && !ability.limits?.lair) return null;

  const fieldClass = "h-9 rounded-md border border-hud-line bg-hud-field px-2 text-sm";

  const changeKind = (kind: string) => {
    const { perform: _p, ...rest } = ability;

    onChange(kind === "attack" ? { ...rest, perform: { kind, attack: performChoices?.attacks[0]?.name ?? "" }, effects: [{ kind: "note", text: ability.description || "Виконує атаку" }] } : kind === "spell" ? { ...rest, perform: { kind, spellId: performChoices?.spells[0]?.id ?? "" }, effects: [{ kind: "note", text: ability.description || "Застосовує заклинання" }] } : rest);
  };

  return (
    <div className="space-y-2">
      <SectionTitle>Виконання</SectionTitle>
      <select aria-label="Виконує" className={fieldClass} value={ability.perform?.kind ?? ""} onChange={(e) => changeKind(e.target.value)}>
        <option value="">Ефекти вміння</option><option value="attack">Атаку</option><option value="spell">Заклинання</option>
      </select>
      {ability.perform?.kind === "attack" && <select aria-label="Атака вміння" className={fieldClass} value={ability.perform.attack} onChange={(e) => onChange({ ...ability, perform: { kind: "attack", attack: e.target.value } })}>
        <option value="">Оберіть атаку</option>{performChoices?.attacks.map((a, i) => <option key={i} value={a.name}>{a.name}</option>)}
      </select>}
      {ability.perform?.kind === "spell" && <select aria-label="Заклинання вміння" className={fieldClass} value={ability.perform.spellId} onChange={(e) => onChange({ ...ability, perform: { kind: "spell", spellId: e.target.value } })}>
        <option value="">Оберіть заклинання</option>{performChoices?.spells.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>}
      <FieldErrors errors={errors} />
    </div>
  );
}
