import { type DndSkill, isDndSkill } from "@/lib/constants/skills";
import { textRef } from "@/lib/i18n/text-ref";
import type { ScaleContext } from "@/lib/utils/abilities/class-columns";
import { isChoiceOpen } from "@/lib/utils/characters/choices/count";
import { describeFeatPicks } from "@/lib/utils/characters/choices/describe";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import { forEachChoiceOwner } from "@/lib/utils/characters/choices/walk";
import type { Ability, AbilitySource, DerivedAbility } from "@/types/abilities";
import type { BackgroundData } from "@/types/backgrounds";
import type { CharacterFeat, Choice, ChoiceOption, ChoiceOwner, ChoicePick, ChoiceRace, ChoicesState, FeatData, Picks, SelectedSpellGrant, SpellGrantPolicy, TextRef } from "@/types/choices";
import type { ResolvedClassEntry } from "@/types/classes";
import type { LogLine } from "@/types/text";

export interface ChoiceGroup {
  source: AbilitySource;
  abilities: DerivedAbility[];
  scale?: ScaleContext;
}

export interface ChoiceSelections {
  tools?: string[];
  background?: { id: string; name: string; equipmentText: string | null; picks: TextRef[] };
  groups: ChoiceGroup[];
  skills: DndSkill[];
  expertise: DndSkill[];
  spells: Array<{ spellId: string; label: LogLine; source: TextRef }>;
  spellGrants: SelectedSpellGrant[];
  slotSpells: string[];
  feats: Array<{ key: string; feat: FeatData; picks: Picks; from: TextRef }>;
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
  from: (choice: Choice) => TextRef;
  sourceFor: (choice: Choice, option: ChoiceOption) => AbilitySource;
  spellOrigin: SpellOrigin;
  scale?: ScaleContext;
  path: string;
  sourceKey: string;
}

type SpellOrigin = TextRef;

const spellOrigin = (kind: "lineage" | "feat" | "race" | "background" | "class", name: string): SpellOrigin => ({ message: `characterProfile.sheet.spellOrigin.${kind}`, params: { name } });

const fromKey = (id: string, params?: TextRef["params"]): TextRef => ({ message: `characterProfile.sheet.from.${id}`, ...(params && { params }) });

const uniqueBy = <T>(list: T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>();

  return list.filter((item) => {
    const k = key(item);

    if (seen.has(k)) return false;

    seen.add(k);

    return true;
  });
};

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

        const origin: SpellOrigin = choice.lineage ? spellOrigin("lineage", o.name) : { message: `${ctx.name}: ${o.name}` };

        const label: LogLine = choice.lineage ? origin : origin.message;

        out.spells.push({ spellId: s.spellId, label, source: origin });

        if (!s.grant || s.grant.via === "slotOrGrant") out.slotSpells.push(s.spellId);

        if (s.grant) out.spellGrants.push({ spellId: s.spellId, label, sourceKey: grantKey(ctx.sourceKey, choice.id, o.id, s.spellId), grantPolicy: s.grant });
      }
    }
  };

  const addFeat = (feat: FeatData, picks: Picks, from: TextRef, key: string, sourceKey = `feat:${feat.id}`) => {
    const source: AbilitySource = { type: "feat", id: feat.id, name: feat.name, icon: feat.icon };

    out.feats.push({ key, feat, picks, from });

    if (feat.abilities.length > 0) out.groups.push({ source, abilities: prefixed(feat.abilities, key) });

    take(feat.choices, picks, { owner: "feat", level: input.level, name: feat.name, from: () => ({ message: feat.name }), sourceFor: (_c, o) => ({ ...source, name: `${feat.name}: ${o.name}` }), spellOrigin: spellOrigin("feat", feat.name), path: key, sourceKey });
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
        const selected = list.map((p) => ({ spellId: p.id, label: ctx.spellOrigin, source: ctx.spellOrigin }));

        out.spells.push(...selected);

        if (!choice.grant || choice.grant.via === "slotOrGrant") out.slotSpells.push(...selected.map((s) => s.spellId));

        if (choice.grant) out.spellGrants.push(...selected.map((s) => ({ spellId: s.spellId, label: s.label, sourceKey: grantKey(ctx.sourceKey, choice.id, undefined, s.spellId), grantPolicy: choice.grant as SpellGrantPolicy })));
      }
    }
  }

  const { background } = input;

  const walkState = { raceChoices: input.raceChoices, backgroundId: background?.id, backgroundChoices: input.backgroundChoices, backgroundFeatPicks: input.backgroundFeatPicks, classes: input.classes, feats: input.feats };

  const walkRefs = {
    race: input.race,
    classesById: Object.fromEntries(input.classes.flatMap((e) => (e.class ? [[e.classId, e.class]] : []))),
    featsById: input.featsById,
    backgroundsById: background ? { [background.id]: background } : {},
  };

  forEachChoiceOwner(walkState, walkRefs, ({ owner, defs, picks, level, legacyPath }) => {
    if (owner.kind === "race") {
      const { race } = owner;

      take(defs, picks, { owner: "race", level, name: race.name, from: () => ({ message: race.name }), sourceFor: (_c, o) => ({ type: "race", id: race.id, name: `${race.name}: ${o.name}` }), spellOrigin: spellOrigin("race", race.name), path: "race", sourceKey: `race:${race.id}` });
    } else if (owner.kind === "background") {
      const bg = owner.background;

      out.skills.push(...bg.skillProficiencies);
      out.tools = [...bg.toolProficiencies];
      out.background = { id: bg.id, name: bg.name, equipmentText: bg.equipmentText, picks: describeFeatPicks(bg, picks) };
      take(defs, picks, { owner: "background", level, name: bg.name, from: () => fromKey("background", { name: bg.name }), sourceFor: (_c, o) => ({ type: "character", id: bg.id, name: `${bg.name}: ${o.name}` }), spellOrigin: spellOrigin("background", bg.name), path: `background:${bg.id}`, sourceKey: `background:${bg.id}` });
    } else if (owner.kind === "backgroundFeat") {
      addFeat(owner.feat, picks, fromKey("background", { name: owner.background.name }), legacyPath, legacyPath);
    } else if (owner.kind === "class") {
      const { cls, entry } = owner;

      take(defs, picks, {
        owner: "class",
        level,
        name: cls.name,
        from: (choice) => fromKey("classLevel", { name: cls.name, level: choice.level }),
        sourceFor: (choice, o) => ({ type: "class", id: cls.id, name: `${cls.name}: ${choice.label} — ${o.name}`, icon: cls.icon }),
        spellOrigin: spellOrigin("class", cls.name),
        scale: { classId: cls.id, level: entry.level, columns: cls.columns ?? [] },
        path: legacyPath,
        sourceKey: legacyPath,
      });
    } else {
      addFeat(owner.feat, picks, fromKey(owner.entry.source === "origin" ? "origin" : "dm"), legacyPath);
    }
  }, { level: input.level, classMode: true });

  out.skills = [...new Set(out.skills)];

  out.expertise = [...new Set(out.expertise)];

  out.spells = uniqueBy(out.spells, (x) => x.spellId);

  out.spellGrants = uniqueBy(out.spellGrants, (x) => x.sourceKey);

  const synthetic: AbilitySource = { type: "character", id: "choices", name: "choices", label: textRef("abilityText.derived.choices.source") };

  if (out.skills.length > 0) {
    out.groups.push({ source: synthetic, abilities: [{ id: "choice-skills", name: "choice-skills", label: textRef("abilityText.derived.choices.skills"), trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "skillProficiency", skills: out.skills }] }] });
  }

  if (out.expertise.length > 0) {
    out.groups.push({ source: synthetic, abilities: [{ id: "choice-expertise", name: "choice-expertise", label: textRef("abilityText.derived.choices.expertise"), trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "skillExpertise", skills: out.expertise }] }] });
  }

  return out;
}
