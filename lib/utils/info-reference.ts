import type { SkillForReference, SpellForReference } from "@/lib/types/info-reference";

export function formatMechanicsSkill(s: SkillForReference): string {
  const parts: string[] = [];

  if (s.mainSkillName) parts.push(`Гілка: ${s.mainSkillName}`);

  const bonuses = s.bonuses as Record<string, number> | undefined;

  if (bonuses && Object.keys(bonuses).length > 0) {
    parts.push(
      "Бонуси: " +
        Object.entries(bonuses)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
    );
  }

  const combat = s.combatStats as Record<string, unknown> | undefined;

  if (combat) {
    const effects = combat.effects as
      | Array<{ stat: string; type: string; value: unknown }>
      | undefined;

    if (effects?.length) {
      parts.push(
        "Ефекти: " +
          effects
            .map((e) => `${e.stat} (${e.type}: ${String(e.value)})`)
            .join("; ")
      );
    }
  }

  const triggers = s.skillTriggers as Array<{ trigger?: string }> | undefined;

  if (Array.isArray(triggers) && triggers.length > 0) {
    parts.push("Тригери: " + triggers.map((t) => t.trigger || "—").join(", "));
  }

  if (s.grantedSpellName) parts.push(`Додає заклинання: ${s.grantedSpellName}`);

  return parts.join(". ") || "—";
}

export function formatMechanicsSpell(s: SpellForReference): string {
  const parts: string[] = [];

  parts.push(`Рівень ${s.level}, ${s.type}, ${s.damageType}`);

  if (s.castingTime) parts.push(`Час: ${s.castingTime}`);

  if (s.range) parts.push(`Дальність: ${s.range}`);

  if (s.duration) parts.push(`Тривалість: ${s.duration}`);

  if (s.diceCount != null && s.diceType)
    parts.push(`Кубики: ${s.diceCount}${s.diceType}`);

  if (s.damageElement) parts.push(`Елемент: ${s.damageElement}`);

  const st = s.savingThrow as {
    ability?: string;
    onSuccess?: string;
    dc?: number;
  } | null;

  if (st?.ability)
    parts.push(
      `Save: ${st.ability}${st.dc != null ? ` DC ${st.dc}` : ""}, при успіху: ${st.onSuccess ?? "—"}`
    );

  return parts.join(". ");
}

export function skillSearchText(s: SkillForReference): string {
  return [
    s.name,
    s.description ?? "",
    s.appearanceDescription ?? "",
    s.mainSkillName ?? "",
    s.grantedSpellName ?? "",
    formatMechanicsSkill(s),
  ]
    .join(" ")
    .toLowerCase();
}

export function spellSearchText(s: SpellForReference): string {
  return [
    s.name,
    s.description ?? "",
    s.appearanceDescription ?? "",
    s.groupName ?? "",
    s.type,
    s.damageType,
    formatMechanicsSpell(s),
    (s.effects || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return terms.every((term) => text.includes(term));
}
