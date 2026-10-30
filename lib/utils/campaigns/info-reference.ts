import type { Translator } from "@/lib/i18n/translator";
import { abilityRegistryOf, flowSegments, linesText } from "@/lib/utils/abilities/segments";
import { spellLabelsOf } from "@/lib/utils/spells/model/labels";
import type { ClassFeature, GameClassData } from "@/types/classes";
import type { ArtifactForReference, ClassFeatureForReference, ClassForReference, ClassSummaryLine, SkillForReference, SpellForReference } from "@/types/info-reference";

function featuresForReference(features: ClassFeature[]): ClassFeatureForReference[] {
  return features
    .flatMap((f): ClassFeatureForReference[] => {
      const own = f.description?.trim() ? [{ level: f.level, name: null, description: f.description.trim() }] : [];

      return [...own, ...f.abilities.map((a) => ({ level: f.level, name: a.name, description: a.description?.trim() || null }))];
    })
    .sort((a, b) => a.level - b.level);
}

export function toClassForReference(c: GameClassData): ClassForReference {
  const summary: ClassSummaryLine[] = [{ key: "hitDie", params: { die: c.hitDie } }];

  if (c.savingThrows.length > 0) summary.push({ key: "savingThrows", params: { list: c.savingThrows.join(",") } });

  if (c.caster !== "none") summary.push(c.spellcastingAbility ? { key: "casterAbility", params: { caster: c.caster, ability: c.spellcastingAbility } } : { key: "caster", params: { caster: c.caster } });

  const { armor, weapons, tools } = c.proficiencies;

  if (armor.length > 0) summary.push({ key: "armor", params: { list: armor.join(", ") } });

  if (weapons.length > 0) summary.push({ key: "weapons", params: { list: weapons.join(", ") } });

  if (tools.length > 0) summary.push({ key: "tools", params: { list: tools.join(", ") } });

  if (c.skillChoices.count > 0) summary.push({ key: "skills", params: { count: c.skillChoices.count, list: c.skillChoices.from.join(", ") } });

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

/** Id params (abilities, caster type) are translated here: ICU cannot translate a key passed as a parameter. */
export function classSummaryText(t: Translator, line: ClassSummaryLine): string {
  const params: Record<string, string | number> = { ...line.params };

  if (line.key === "savingThrows") params.list = String(params.list).split(",").map((id) => t(`gameTerms.abilities.${id}.label`)).join(", ");

  if (params.caster) params.caster = t(`classes.casters.${params.caster}`);

  if (params.ability) params.ability = t(`gameTerms.abilities.${params.ability}.label`);

  return t(`dashboard.reference.summary.${line.key}`, params);
}

export function classSearchText(c: ClassForReference, t: Translator): string {
  const featureText = (f: ClassFeatureForReference) => [f.name, f.description];

  return [c.name, ...c.summary.map((line) => classSummaryText(t, line)), ...c.features.flatMap(featureText), ...c.subclasses.flatMap((s) => [s.name, ...s.features.flatMap(featureText)])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatMechanicsSkill(s: SkillForReference, t: Translator): string {
  const parts: string[] = [];

  if (s.mainSkillName) parts.push(t("dashboard.reference.mechanics.branch", { name: s.mainSkillName }));

  if (s.abilitySummary.length > 0) parts.push(t("dashboard.reference.mechanics.abilities", { list: linesText(abilityRegistryOf(t), s.abilitySummary.map(flowSegments)).join("; ") }));

  if (s.grantedSpellName) parts.push(t("dashboard.reference.mechanics.grantedSpell", { name: s.grantedSpellName }));

  return parts.join(". ") || "—";
}

export function formatMechanicsSpell(s: SpellForReference, t: Translator): string {
  const labels = spellLabelsOf(t);

  const parts: string[] = [t("dashboard.reference.mechanics.spell", { level: t(`gameTerms.spellLevels.${s.level}`), type: labels.targeting(s.targeting) })];

  if (s.dice > 0) parts.push(t("dashboard.reference.mechanics.dice", { count: s.dice }));

  parts.push(t("dashboard.reference.mechanics.resolution", { value: labels.resolution(s.resolution) }), t("dashboard.reference.mechanics.cost", { value: labels.cost(s.cost) }));

  return parts.join(". ");
}

export function skillSearchText(s: SkillForReference, t: Translator): string {
  return [
    s.name,
    s.description ?? "",
    s.appearanceDescription ?? "",
    s.mainSkillName ?? "",
    s.grantedSpellName ?? "",
    formatMechanicsSkill(s, t),
  ]
    .join(" ")
    .toLowerCase();
}

export function spellSearchText(s: SpellForReference, t: Translator): string {
  return [
    s.name,
    s.description ?? "",
    s.appearanceDescription ?? "",
    s.groupName ?? "",
    formatMechanicsSpell(s, t),
    linesText(abilityRegistryOf(t), s.effects || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export function artifactSearchText(a: ArtifactForReference, t: Translator): string {
  return [a.name, a.description, a.setName, a.holderName, ...linesText(abilityRegistryOf(t), a.effects.map(flowSegments))].filter(Boolean).join(" ").toLowerCase();
}

export function matchSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return terms.every((term) => text.includes(term));
}

const SHORT_SUMMARY_LENGTH = 72;

export function getShortSkillSummary(s: SkillForReference, t: Translator): string {
  if (s.description?.trim()) {
    const first = s.description.split(/\n/)[0]?.trim() ?? "";

    if (first.length <= SHORT_SUMMARY_LENGTH) return first;

    return first.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
  }

  const mechanics = formatMechanicsSkill(s, t);

  if (mechanics.length <= SHORT_SUMMARY_LENGTH) return mechanics;

  return mechanics.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
}

export function getShortSpellSummary(s: SpellForReference, t: Translator): string {
  if (s.description?.trim()) {
    const first = s.description.split(/\n/)[0]?.trim() ?? "";

    if (first.length <= SHORT_SUMMARY_LENGTH) return first;

    return first.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
  }

  const mechanics = formatMechanicsSpell(s, t);

  if (mechanics.length <= SHORT_SUMMARY_LENGTH) return mechanics;

  return mechanics.slice(0, SHORT_SUMMARY_LENGTH - 2) + "…";
}
