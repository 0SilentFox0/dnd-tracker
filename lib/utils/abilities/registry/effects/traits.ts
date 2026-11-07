import type { FieldMeta } from "../fields";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import type { AnyEffect } from "@/lib/utils/abilities/schema";
import { PSYCHOLOGY_KINDS, TRAIT_ATTACKS, TRAIT_SIZES } from "@/lib/utils/abilities/schema/kinds";
import { seg, type Segment } from "@/lib/utils/abilities/segments";

const num = (name: string, optional?: boolean): FieldMeta => ({ name, input: "number", ...(optional && { optional }) });

const options = (values: readonly string[]) => values.map((value) => ({ value }));

export const traitFields = {
  wfrpArmour: [num("head"), num("body"), num("arm"), num("leg")],
  wfrpWard: [num("value")],
  wfrpSize: [{ name: "size", input: "select", options: options(TRAIT_SIZES) }],
  wfrpPsychology: [{ name: "psychology", input: "select", options: options(PSYCHOLOGY_KINDS) }, num("value")],
  wfrpAttack: [
    { name: "attack", input: "select", options: options(TRAIT_ATTACKS) },
    num("damage"),
    { ...num("rangeFt", true), visibleWhen: (v) => v.attack === "breath" },
    { name: "magical", input: "toggle", optional: true },
  ],
} as const satisfies Record<string, readonly FieldMeta[]>;

type Of<K extends AnyEffect["kind"]> = Extract<AnyEffect, { kind: K }>;

export const traitDescribe = {
  wfrpArmour: (e: Of<"wfrpArmour">): Segment[] => [seg("summary.effects.wfrpArmour", { head: e.head, arm: e.arm, body: e.body, leg: e.leg })],
  wfrpWard: (e: Of<"wfrpWard">): Segment[] => [seg("summary.effects.wfrpWard", { value: e.value })],
  wfrpSize: (e: Of<"wfrpSize">): Segment[] => [seg("summary.effects.wfrpSize", { size: seg(`effects.wfrpSize.options.size.${e.size}`) })],
  wfrpPsychology: (e: Of<"wfrpPsychology">): Segment[] => [seg("summary.effects.wfrpPsychology", { psychology: seg(`effects.wfrpPsychology.options.psychology.${e.psychology}`), value: e.value })],
  wfrpAttack: (e: Of<"wfrpAttack">): Segment[] => [
    seg("summary.effects.wfrpAttack", { attack: seg(`effects.wfrpAttack.options.attack.${e.attack}`), damage: e.damage, magical: e.magical ? "yes" : "no" }),
  ],
};

export const applyTrait = (input: EffectApplyInput<AnyEffect>): EffectApplyResult => ({ participants: input.participants, messages: [] });
