import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { CHOICE_ID_RE, CHOICE_KINDS, CHOICE_LIMITS, FEAT_TYPES } from "@/lib/constants/choices";
import { CLASS_COLUMN_KEY_RE } from "@/lib/constants/classes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import type { Choice, ChoiceOwner } from "@/types/choices";

const choiceId = z.string().regex(CHOICE_ID_RE, "Id — малі латинські літери, цифри й дефіс");

const description = z.string().max(CHOICE_LIMITS.description).optional();

export const SpellGrantPolicySchema = z.object({
  sharedPool: choiceId.optional(),
  uses: z.union([z.number().int().min(1).max(20), z.literal("proficiency")]),
  rest: z.enum(["short", "long"]),
  castLevel: z.number().int().min(0).max(9).optional(),
  via: z.enum(["grant", "slotOrGrant"]).optional(),
  dcAbility: z.enum(ABILITY_KEYS).optional(),
});

export const SpellListsSchema = z.array(z.string().trim().min(1).max(CHOICE_LIMITS.listLength)).max(CHOICE_LIMITS.lists);

export const ChoiceOptionSchema = z.object({
  id: choiceId,
  name: z.string().trim().min(1).max(100),
  description,
  minLevel: z.number().int().min(1).max(20).optional(),
  requires: z.array(choiceId).max(CHOICE_LIMITS.requires).optional(),
  abilities: AbilitiesSchema.default([]),
  spells: z
    .array(z.object({ level: z.number().int().min(1).max(20), spellId: z.string().trim().min(1).max(100), grant: SpellGrantPolicySchema.optional() }))
    .max(CHOICE_LIMITS.optionSpells)
    .optional(),
});

const countSchema = z.union([z.number().int().min(1).max(CHOICE_LIMITS.count), z.object({ scale: z.string().regex(CLASS_COLUMN_KEY_RE).max(40) })]);

function kindIssues(c: Choice, ctx: z.RefinementCtx) {
  const need = (ok: boolean, path: (string | number)[], message: string) => {
    if (!ok) ctx.addIssue({ code: "custom", path, message });
  };

  need(c.kind !== "option" || (c.options?.length ?? 0) > 0, ["options"], "Додайте хоча б одну опцію");
  need(c.kind !== "feat" || (c.featTypes?.length ?? 0) > 0, ["featTypes"], "Оберіть типи рис");
  need(c.kind !== "abilityScore" || !!c.points, ["points"], "Вкажіть, скільки разів +1");
  need(c.kind !== "spell" || !!c.spells, ["spells"], "Вкажіть списки й кола");
  need(!c.spells || c.spells.maxLevel === "slots" || c.spells.maxLevel >= c.spells.minLevel, ["spells", "maxLevel"], "Найвище коло менше за найнижче");
  need(c.maxPerAbility === undefined || c.kind === "abilityScore", ["maxPerAbility"], "Обмеження характеристики — лише для abilityScore");
  need(!c.grant || c.kind === "spell", ["grant"], "Безкоштовний каст можна задати лише вибору заклинань");

  const ids = (c.options ?? []).map((o) => o.id);

  need(new Set(ids).size === ids.length, ["options"], "Id опцій повторюються");

  (c.options ?? []).forEach((o, i) => need((o.requires ?? []).every((r) => r !== o.id && ids.includes(r)), ["options", i, "requires"], "Вимога посилається на невідому опцію"));
}

export const ChoiceSchema = z
  .object({
    id: choiceId,
    label: z.string().trim().min(1).max(100),
    description,
    level: z.number().int().min(1).max(20).default(1),
    count: countSchema.default(1),
    lineage: z.literal(true).optional(),
    kind: z.enum(CHOICE_KINDS),
    options: z.array(ChoiceOptionSchema).max(CHOICE_LIMITS.options).optional(),
    featTypes: z.array(z.enum(FEAT_TYPES)).min(1).max(FEAT_TYPES.length).optional(),
    skills: z.array(z.enum(DND_SKILLS)).max(DND_SKILLS.length).optional(),
    abilities: z.array(z.enum(ABILITY_KEYS)).min(1).max(ABILITY_KEYS.length).optional(),
    points: z.number().int().min(1).max(CHOICE_LIMITS.points).optional(),
    maxPerAbility: z.number().int().min(1).max(CHOICE_LIMITS.points).optional(),
    max: z.number().int().min(1).max(CHOICE_LIMITS.max).optional(),
    spells: z
      .object({ lists: SpellListsSchema, minLevel: z.number().int().min(0).max(9), maxLevel: z.union([z.number().int().min(0).max(9), z.literal("slots")]) })
      .optional(),
    grant: SpellGrantPolicySchema.optional(),
  })
  .superRefine((c, ctx) => kindIssues(c as Choice, ctx));

function ownerIssues(owner: ChoiceOwner) {
  return (list: Choice[], ctx: z.RefinementCtx) => {
    const ids = list.map((c) => c.id);

    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: [], message: "Id виборів повторюються" });

    if (owner !== "race" && list.some((c) => c.lineage)) ctx.addIssue({ code: "custom", path: [], message: "Лінія — лише у вибору раси" });

    if (owner === "race" && list.filter((c) => c.lineage).length > 1) ctx.addIssue({ code: "custom", path: [], message: "Раса має не більше однієї лінії" });

    list.forEach((c, i) => {
      if (owner !== "class" && typeof c.count !== "number") ctx.addIssue({ code: "custom", path: [i, "count"], message: "Кількість «з таблиці класу» — лише у класі" });

      if (owner === "feat" && c.kind === "feat") ctx.addIssue({ code: "custom", path: [i, "kind"], message: "Риса не може містити вибір риси" });
    });
  };
}

export const choicesSchemaFor = (owner: ChoiceOwner) => z.array(ChoiceSchema).max(CHOICE_LIMITS.choices).superRefine(ownerIssues(owner));

export const RaceChoicesSchema = choicesSchemaFor("race");

export const ClassChoicesSchema = choicesSchemaFor("class");

export const FeatChoicesSchema = choicesSchemaFor("feat");

const pickId = z.string().trim().min(1).max(100);

const leafPicks = z.record(choiceId, z.array(z.object({ id: pickId })).max(CHOICE_LIMITS.picks));

export const PicksSchema = z.record(choiceId, z.array(z.object({ id: pickId, picks: leafPicks.optional() })).max(CHOICE_LIMITS.picks));

export const CharacterFeatsSchema = z
  .array(z.object({ id: pickId, picks: leafPicks.optional(), source: z.enum(["origin", "dm"]) }))
  .max(CHOICE_LIMITS.characterFeats);

export const BackgroundSelectionFields = {
  backgroundId: z.string().trim().min(1).max(100).nullable().optional(),
  backgroundChoices: PicksSchema.optional(),
  backgroundFeatPicks: PicksSchema.optional(),
};

export const ChoicesBodySchema = z
  .object({ ...BackgroundSelectionFields, raceChoices: PicksSchema.optional(), feats: CharacterFeatsSchema.optional(), classChoices: z.record(z.string().min(1).max(100), PicksSchema).optional() })
  .refine((b) => b.backgroundId !== undefined || b.backgroundChoices !== undefined || b.backgroundFeatPicks !== undefined || b.raceChoices !== undefined || b.feats !== undefined || b.classChoices !== undefined, { message: "Немає виборів для збереження" });

export const DraftChoicesSchema = z.object({ ...BackgroundSelectionFields, raceChoices: PicksSchema.optional(), feats: CharacterFeatsSchema.optional(), classChoices: PicksSchema.optional() });

export const FeatPrerequisiteSchema = z.object({
  manualText: z.array(z.string().trim().min(1).max(8000)).max(30).optional(),
  level: z.number().int().min(1).max(20).optional(),
  scores: z.object({ abilities: z.array(z.enum(ABILITY_KEYS)).min(1).max(ABILITY_KEYS.length), min: z.number().int().min(1).max(30) }).optional(),
  text: z.string().trim().max(200).optional(),
});
