import type { Glossary } from "./spell-header";

const HEADER = /^(Tiny|Small|Medium|Large|Huge|Gargantuan) (Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|Humanoid|Monstrosity|Ooze|Plant|Undead), (Unaligned|(?:Lawful|Chaotic|Neutral)(?: (?:Good|Evil|Neutral))?)$/;

const GENDER_SUFFIX: Record<string, string> = { m: "", f: "|f", n: "|n" };

// The stat block title line is mechanical: size, type and alignment are rebuilt from the glossary, with gender agreement by the type
export function normalizeCreatureHeader(en: string, tr: string, glossary: Glossary): string {
  const m = HEADER.exec(en.split("\n")[0]);

  const trHead = tr.split("\n")[0];

  if (!m || !trHead.includes(", ") || trHead.includes(":")) return tr;

  const [, size, type, alignment] = m;

  const suffix = GENDER_SUFFIX[glossary[`${type}|gender`]];

  const agree = (key: string) => (suffix ? (glossary[`${key}${suffix}`] ?? glossary[key]) : glossary[key]);

  const [sizeTr, typeTr, alignmentTr] = [agree(size), glossary[type], alignment === "Unaligned" ? glossary.Unaligned : agree(alignment)];

  if ([sizeTr, typeTr, alignmentTr].some((v) => v === undefined)) return tr;

  return [`${sizeTr} ${typeTr}, ${alignmentTr}`, ...tr.split("\n").slice(1)].join("\n");
}
