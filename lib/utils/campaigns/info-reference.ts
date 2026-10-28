import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { CLASS_CASTER_LABELS } from "@/lib/constants/classes";
import { spellLevelName } from "@/lib/constants/spells";
import type { ClassFeature, GameClassData } from "@/types/classes";
import type { ArtifactForReference, ClassFeatureForReference, ClassForReference, SkillForReference, SpellForReference } from "@/types/info-reference";

function featuresForReference(features: ClassFeature[]): ClassFeatureForReference[] {
  return features
    .flatMap((f): ClassFeatureForReference[] => {
      const own = f.description?.trim() ? [{ level: f.level, name: null, description: f.description.trim() }] : [];

      return [...own, ...f.abilities.map((a) => ({ level: f.level, name: a.name, description: a.description?.trim() || null }))];
    })
    .sort((a, b) => a.level - b.level);
}

export function toClassForReference(c: GameClassData): ClassForReference {
  const summary = [`Кістка здоров'я: к${c.hitDie}`];

  if (c.savingThrows.length > 0) summary.push(`Рятівні кидки: ${c.savingThrows.map((k) => ABILITY_LABELS[k]).join(", ")}`);

  if (c.caster !== "none") summary.push(`${CLASS_CASTER_LABELS[c.caster]}${c.spellcastingAbility ? ` (${ABILITY_LABELS[c.spellcastingAbility]})` : ""}`);

  const { armor, weapons, tools } = c.proficiencies;

  if (armor.length > 0) summary.push(`Обладунки: ${armor.join(", ")}`);

  if (weapons.length > 0) summary.push(`Зброя: ${weapons.join(", ")}`);

  if (tools.length > 0) summary.push(`Інструменти: ${tools.join(", ")}`);

  if (c.skillChoices.count > 0) summary.push(`Навички: ${c.skillChoices.count} з ${c.skillChoices.from.join(", ")}`);

  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    summary,
    features: featuresForReference(c.features),
    subclasses: c.subclasses.map((s) => ({ id: s.id, name: s.name, features: featuresForReference(s.features) })),
  };
}

export function classSearchText(c: ClassForReference): string {
  const featureText = (f: ClassFeatureForReference) => [f.name, f.description];

  return [c.name, ...c.summary, ...c.features.flatMap(featureText), ...c.subclasses.flatMap((s) => [s.name, ...s.features.flatMap(featureText)])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatMechanicsSkill(s: SkillForReference): string {
  const parts: string[] = [];

  if (s.mainSkillName) parts.push(`Гілка: ${s.mainSkillName}`);

  if (s.abilitySummary.length > 0) parts.push(`Вміння: ${s.abilitySummary.join("; ")}`);

  if (s.grantedSpellName) parts.push(`Додає заклинання: ${s.grantedSpellName}`);

  return parts.join(". ") || "—";
}

export function formatMechanicsSpell(s: SpellForReference): string {
  const parts: string[] = [`${spellLevelName(s.level)}, ${s.type}`];

  if (s.dice > 0) parts.push(`Кубики: ${s.dice}к`);

  parts.push(`Перевірка: ${s.resolution}`, `Вартість: ${s.cost}`);

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
    formatMechanicsSpell(s),
    (s.effects || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export function artifactSearchText(a: ArtifactForReference): string {
  return [a.name, a.description, a.setName, a.holderName, ...a.effects].filter(Boolean).join(" ").toLowerCase();
}

export function matchSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return terms.every((term) => text.includes(term));
}

const SHORT_SUMMARY_LENGTH = 72;

export function getShortSkillSummary(s: SkillForReference): string {
  if (s.description?.trim()) {
    const first = s.description.split(/\n/)[0]?.trim() ?? "";

    if (first.length <= SHORT_SUMMARY_LENGTH) return first;

    return first.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
  }

  const mechanics = formatMechanicsSkill(s);

  if (mechanics.length <= SHORT_SUMMARY_LENGTH) return mechanics;

  return mechanics.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
}

export function getShortSpellSummary(s: SpellForReference): string {
  if (s.description?.trim()) {
    const first = s.description.split(/\n/)[0]?.trim() ?? "";

    if (first.length <= SHORT_SUMMARY_LENGTH) return first;

    return first.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
  }

  const mechanics = formatMechanicsSpell(s);

  if (mechanics.length <= SHORT_SUMMARY_LENGTH) return mechanics;

  return mechanics.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
}
