import { WFRP_ROW_KINDS, type WfrpData, type WfrpRowKind } from "../../templates/systems/wfrp/common";
import { composeCreature, composeItem, composeSkill, composeSpell, rarityFlair } from "../icon-prompts/compose";

export type GrimSubjects = {
  units: Record<string, string>;
  spells: Record<string, { palette: string; subject: string }>;
  artifacts: Record<string, string>;
  identity: Record<string, string>;
};

export type GrimPromptRow = { recordId: string; kind: WfrpRowKind; name: string; file: string; prompt: string };

export const grimSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const IDENTITY_COLOURS = "neutral gold";

export const GRIM_NO_TEXT = "Image only: absolutely no text, letters, words, numbers, runes, captions, signs, signatures or watermarks anywhere in the picture.";

function basePrompt(kind: WfrpRowKind, name: string, rarity: unknown, subjects: GrimSubjects): string {
  const missing = (): never => {
    throw new Error(`Немає субʼєкта іконки: ${kind} "${name}"`);
  };

  if (kind === "units") return composeCreature(subjects.units[name] ?? missing(), "portrait");

  if (kind === "artifacts") return composeItem(subjects.artifacts[name] ?? missing(), rarityFlair(typeof rarity === "string" ? rarity : null));

  if (kind === "spells") {
    const spell = subjects.spells[name] ?? missing();

    return composeSpell(spell.subject, spell.palette);
  }

  return composeSkill(subjects.identity[`${kind}:${name}`] ?? missing(), IDENTITY_COLOURS, null);
}

const promptFor = (kind: WfrpRowKind, name: string, rarity: unknown, subjects: GrimSubjects) => `${basePrompt(kind, name, rarity, subjects)} ${GRIM_NO_TEXT}`;

export function grimPromptRows(data: WfrpData, subjects: GrimSubjects): GrimPromptRow[] {
  return WFRP_ROW_KINDS.flatMap((kind) =>
    data[kind].map((row) => {
      const name = String(row.name);

      return { recordId: `${kind}:${name}`, kind, name, file: `${kind}/${grimSlug(name)}.png`, prompt: promptFor(kind, name, row.rarity, subjects) };
    }),
  );
}
