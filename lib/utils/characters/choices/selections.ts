import { type DndSkill, isDndSkill } from "@/lib/constants/skills";
import type { ScaleContext } from "@/lib/utils/abilities/class-columns";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { isChoiceOpen } from "@/lib/utils/characters/choices/count";
import { describeFeatPicks } from "@/lib/utils/characters/choices/describe";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import type { Ability, AbilitySource } from "@/types/abilities";
import type { BackgroundData } from "@/types/backgrounds";
import type { CharacterFeat, Choice, ChoiceOption, ChoiceOwner, ChoicePick, ChoiceRace, ChoicesState, FeatData, Picks, SelectedSpellGrant, SpellGrantPolicy } from "@/types/choices";
import type { ResolvedClassEntry } from "@/types/classes";

export interface ChoiceGroup {
  source: AbilitySource;
  abilities: Ability[];
  scale?: ScaleContext;
}

export interface ChoiceSelections {
  tools?: string[];
  background?: { id: string; name: string; equipmentText: string | null; picks: string[] };
  groups: ChoiceGroup[];
  skills: DndSkill[];
  expertise: DndSkill[];
  spells: Array<{ spellId: string; label: string }>;
  spellGrants: SelectedSpellGrant[];
  slotSpells: string[];
  feats: Array<{ key: string; feat: FeatData; picks: Picks; from: string }>;
  options: Array<{ owner: string; label: string; names: string[] }>;
  lineage: string | null;
}

export interface SelectionInput {
  background?: BackgroundData | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
  race: ChoiceRace | null;
  raceChoices: Picks;
  classes: readonly ResolvedClassEntry[];
  feats: readonly CharacterFeat[];
  featsById: Readonly<Record<string, FeatData>>;
  level: number;
}

interface OwnerCtx {
  owner: ChoiceOwner;
  level: number;
  name: string;
  from: (choice: Choice) => string;
  sourceFor: (choice: Choice, option: ChoiceOption) => AbilitySource;
  spellLabel: string;
  scale?: ScaleContext;
  path: string;
  sourceKey: string;
}

const prefixed = (abilities: Ability[], prefix: string): Ability[] => abilities.map((a) => ({ ...a, id: `${prefix}.${a.id}` }));

const stablePart = (value: string) => encodeURIComponent(value);

const grantKey = (source: string, choiceId: string, optionId: string | undefined, spellId: string) => {
  const separator = source.indexOf(":");

  const sourcePrefix = separator < 0 ? stablePart(source) : `${source.slice(0, separator)}:${stablePart(source.slice(separator + 1))}`;

  const suffix = [choiceId, optionId, spellId].filter((part): part is string => !!part).map(stablePart).join(":");

  return `${sourcePrefix}:${suffix}`;
};

export const selectionNeedsFeats = (state: ChoicesState, classMode: boolean): boolean =>
  !!state.backgroundId || hasPicks(state.raceChoices) || (classMode && (state.feats.length > 0 || state.classes.some((e) => hasPicks(e.choices))));

export function choiceSelections(input: SelectionInput): ChoiceSelections {
  const out: ChoiceSelections = { groups: [], skills: [], expertise: [], spells: [], spellGrants: [], slotSpells: [], feats: [], options: [], lineage: null };

  const addOptions = (choice: Choice, picks: ChoicePick[], ctx: OwnerCtx) => {
    const picked = picks.flatMap((p) => choice.options?.find((o) => o.id === p.id) ?? []);

    if (picked.length === 0) return;

    out.options.push({ owner: ctx.name, label: choice.label, names: picked.map((o) => o.name) });

    if (choice.lineage) out.lineage = picked[0].name;

    for (const o of picked) {
      if (o.abilities.length > 0) out.groups.push({ source: ctx.sourceFor(choice, o), abilities: prefixed(o.abilities, `${ctx.path}.${choice.id}.${o.id}`), ...(ctx.scale && { scale: ctx.scale }) });

      for (const s of o.spells ?? []) {
        if (s.level > input.level) continue;

        const label = choice.lineage ? `Лінія: ${o.name}` : `${ctx.name}: ${o.name}`;

        out.spells.push({ spellId: s.spellId, label });

        if (!s.grant || s.grant.via === "slotOrGrant") out.slotSpells.push(s.spellId);

        if (s.grant) out.spellGrants.push({ spellId: s.spellId, label, sourceKey: grantKey(ctx.sourceKey, choice.id, o.id, s.spellId), grantPolicy: s.grant });
      }
    }
  };

  const addFeat = (feat: FeatData, picks: Picks, from: string, key: string, sourceKey = `feat:${feat.id}`) => {
    const source: AbilitySource = { type: "feat", id: feat.id, name: feat.name, icon: feat.icon };

    out.feats.push({ key, feat, picks, from });

    if (feat.abilities.length > 0) out.groups.push({ source, abilities: prefixed(feat.abilities, key) });

    take(feat.choices, picks, { owner: "feat", level: input.level, name: feat.name, from: () => feat.name, sourceFor: (_c, o) => ({ ...source, name: `${feat.name}: ${o.name}` }), spellLabel: `Риса: ${feat.name}`, path: key, sourceKey });
  };

  function take(defs: readonly Choice[], picks: Picks, ctx: OwnerCtx) {
    for (const choice of defs) {
      if (!isChoiceOpen(choice, ctx.level, ctx.owner)) continue;

      const list = picks[choice.id] ?? [];

      const at = `${ctx.path}.${choice.id}`;

      if (choice.kind === "option") addOptions(choice, list, ctx);

      if (choice.kind === "feat") {
        list.forEach((p, i) => {
          if (choice.options?.some((o) => o.id === p.id)) return addOptions(choice, [p], ctx);

          const feat = input.featsById[p.id];

          if (feat) addFeat(feat, p.picks ?? {}, ctx.from(choice), `${at}.${i}`);
        });
      }

      if (choice.kind === "skill" || choice.kind === "expertise") out[choice.kind === "skill" ? "skills" : "expertise"].push(...list.map((p) => p.id).filter(isDndSkill));

      if (choice.kind === "spell") {
        const selected = list.map((p) => ({ spellId: p.id, label: ctx.spellLabel }));

        out.spells.push(...selected);

        if (!choice.grant || choice.grant.via === "slotOrGrant") out.slotSpells.push(...selected.map((s) => s.spellId));

        if (choice.grant) out.spellGrants.push(...selected.map((s) => ({ ...s, sourceKey: grantKey(ctx.sourceKey, choice.id, undefined, s.spellId), grantPolicy: choice.grant as SpellGrantPolicy })));
      }
    }
  }

  const { race } = input;

  if (race) {
    take(race.choices, input.raceChoices, { owner: "race", level: input.level, name: race.name, from: () => race.name, sourceFor: (_c, o) => ({ type: "race", id: race.id, name: `${race.name}: ${o.name}` }), spellLabel: `Раса: ${race.name}`, path: "race", sourceKey: `race:${race.id}` });
  }

  const background = input.background;

  if (background) {
    out.skills.push(...background.skillProficiencies);
    out.tools = [...background.toolProficiencies];
    out.background = { id: background.id, name: background.name, equipmentText: background.equipmentText, picks: describeFeatPicks(background, input.backgroundChoices ?? {}) };
    take(background.choices, input.backgroundChoices ?? {}, { owner: "background", level: input.level, name: background.name, from: () => `Передісторія: ${background.name}`, sourceFor: (_c, o) => ({ type: "character", id: background.id, name: `${background.name}: ${o.name}` }), spellLabel: `Передісторія: ${background.name}`, path: `background:${background.id}`, sourceKey: `background:${background.id}` });

    const feat = background.originFeatId ? input.featsById[background.originFeatId] : null;

    if (feat) addFeat(feat, input.backgroundFeatPicks ?? {}, `Передісторія: ${background.name}`, `background:${background.id}:feat:${feat.id}`, `background:${background.id}:feat:${feat.id}`);
  }

  for (const entry of input.classes) {
    const cls = entry.class;

    if (!cls) continue;

    take(classChoiceDefs(cls, entry.subclass), entry.choices ?? {}, {
      owner: "class",
      level: entry.level,
      name: cls.name,
      from: (choice) => `${cls.name} ${choice.level}`,
      sourceFor: (choice, o) => ({ type: "class", id: cls.id, name: `${cls.name}: ${choice.label} — ${o.name}`, icon: cls.icon }),
      spellLabel: `Клас: ${cls.name}`,
      scale: { classId: cls.id, level: entry.level, columns: cls.columns ?? [] },
      path: `class:${cls.id}`,
      sourceKey: `class:${cls.id}`,
    });
  }

  input.feats.forEach((f, i) => {
    const feat = input.featsById[f.id];

    if (feat) addFeat(feat, f.picks ?? {}, f.source === "origin" ? "Походження" : "ДМ", `feat:${i}`);
  });

  out.skills = [...new Set(out.skills)];

  out.expertise = [...new Set(out.expertise)];

  out.spells = out.spells.filter((s, i) => out.spells.findIndex((x) => x.spellId === s.spellId) === i);

  out.spellGrants = out.spellGrants.filter((s, i) => out.spellGrants.findIndex((x) => x.sourceKey === s.sourceKey) === i);

  const synthetic: AbilitySource = { type: "character", id: "choices", name: "Вибори" };

  if (out.skills.length > 0) {
    out.groups.push({ source: synthetic, abilities: [{ id: "choice-skills", name: "Майстерність з виборів", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "skillProficiency", skills: out.skills }] }] });
  }

  if (out.expertise.length > 0) {
    out.groups.push({ source: synthetic, abilities: [{ id: "choice-expertise", name: "Експертиза з виборів", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "skillExpertise", skills: out.expertise }] }] });
  }

  return out;
}
