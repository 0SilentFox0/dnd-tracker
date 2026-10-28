export type PromptKind = "creature" | "spell" | "skill" | "item";

export type AttachKind = "units" | "spells" | "artifacts" | "skills" | "main-skills";

export interface PromptRow {
  file: string;
  name: string;
  kind: AttachKind;
  prompt: string;
  group: string;
}

export const NEGATIVE_PROMPT =
  "text, letters, watermark, signature, frame, multiple subjects, blurry, cropped";

const STYLE_CORE =
  "Digital painting in the spirit of classic fantasy RPG icons, rich colours, dramatic rim light, painterly brushwork, no text, no letters, no watermark.";

export const STYLE_PREFIX: Record<PromptKind, string> = {
  creature: `${STYLE_CORE} Circular token composition on a plain dark vignette background, no frame; the subject sits in the centre of the circle and fills about 80% of it, readable at 64 px. Square 1:1, 1024x1024.`,
  spell: `${STYLE_CORE} Square game icon with a single strong central motif depicting the effect, dark smoky background, glowing energy, no frame. Square 1:1, 1024x1024.`,
  skill: `${STYLE_CORE} Square game skill icon with a single strong central motif, dark smoky background, soft glow, no frame. Square 1:1, 1024x1024.`,
  item: `${STYLE_CORE} The item alone in three-quarter view, centred on a dark parchment-textured background with a soft shadow, no frame, no hands, no other objects. Square 1:1, 1024x1024.`,
};

export const PALETTES: Record<string, string> = {
  fire: "fire orange-red",
  cold: "icy blue",
  lightning: "lightning violet-white",
  necrotic: "sickly green-black necrotic",
  radiant: "radiant gold",
  psychic: "psychic magenta",
  force: "pale blue force",
  acid: "acid green",
  poison: "poison green-purple",
  thunder: "deep thunder blue",
  healing: "warm healing gold-green",
  abjuration: "abjuration silver-blue",
  divination: "divination teal",
  enchantment: "enchantment pink",
  illusion: "illusion purple",
  conjuration: "conjuration amber",
  transmutation: "transmutation emerald",
  evocation: "pale blue force",
  necromancy: "sickly green-black necrotic",
  nature: "living green and earthy brown",
  earth: "earthy brown and amber",
};

export const SKILL_GROUP_PALETTES: Record<string, string> = {
  Напад: "warrior red and steel",
  Стрільба: "forest green and silver",
  Захист: "steel blue",
  Лідерство: "banner gold",
  Світло: "radiant gold",
  Темрява: "shadow purple and sickly green",
  Хаос: "fire orange-red",
  Природа: "living emerald green",
  Раса: "bronze and amber",
  Ультимат: "crimson and gold",
  Персональні: "royal violet",
};

const TIER_RINGS: { test: RegExp; text: string }[] = [
  { test: /базов/i, text: "a thin bronze ring around the icon (basic tier)" },
  { test: /просунут/i, text: "a thin silver ring around the icon (advanced tier)" },
  { test: /експерт/i, text: "a thin gold ring around the icon (expert tier)" },
];

export function tierRing(name: string): string | null {
  return TIER_RINGS.find((t) => t.test.test(name))?.text ?? null;
}

const RARITY_FLAIR: Record<string, string> = {
  rare: "a faint magical glimmer",
  epic: "a soft purple magical glow",
  legendary: "a strong golden magical glow",
};

export function rarityFlair(rarity: string | null | undefined): string | null {
  return (rarity && RARITY_FLAIR[rarity.toLowerCase()]) || null;
}

const trimDot = (s: string) => s.trim().replace(/[.\s]+$/, "");

export type Framing = "portrait" | "full";

export function composeCreature(subject: string, framing: Framing): string {
  const lead = framing === "full" ? "Full-body view of" : "Head-and-shoulders portrait of";

  return `${STYLE_PREFIX.creature} ${lead} ${trimDot(subject)}.`;
}

export function composeSpell(subject: string, palette: string): string {
  const colours = PALETTES[palette] ?? palette;

  return `${STYLE_PREFIX.spell} Central motif: ${trimDot(subject)}. Colour key: ${colours}.`;
}

export function composeSkill(subject: string, colours: string, ring: string | null): string {
  const tail = ring ? ` Add ${ring}.` : "";

  return `${STYLE_PREFIX.skill} Central motif: ${trimDot(subject)}. Colour key: ${colours}.${tail}`;
}

export function composeItem(subject: string, flair: string | null): string {
  const tail = flair ? ` Add ${flair} around it.` : "";

  return `${STYLE_PREFIX.item} The item: ${trimDot(subject)}.${tail}`;
}

const FORBIDDEN = /heroes|might\s*(and|&)\s*magic|ubisoft|homm/i;

export function assertCleanPrompt(row: PromptRow): void {
  if (!row.prompt.trim()) throw new Error(`Порожній промпт: ${row.file}`);

  if (FORBIDDEN.test(row.prompt)) throw new Error(`Заборонена згадка у промпті: ${row.file}`);
}

export function assertUniqueFiles(rows: PromptRow[], label: string): void {
  const seen = new Set<string>();

  for (const r of rows) {
    if (seen.has(r.file)) throw new Error(`${label}: дубль файлу ${r.file}`);

    seen.add(r.file);
  }
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function toCsv(rows: PromptRow[]): string {
  const lines = rows.map((r) =>
    [r.file, r.name, r.kind, r.prompt].map(csvCell).join(","),
  );

  return `file,name,kind,prompt\n${lines.join("\n")}\n`;
}

export function toMarkdown(title: string, intro: string, rows: PromptRow[]): string {
  const groups = new Map<string, PromptRow[]>();

  for (const r of rows) {
    const list = groups.get(r.group) ?? [];

    list.push(r);
    groups.set(r.group, list);
  }

  const out: string[] = [`# ${title}`, "", intro, "", `Усього: ${rows.length}.`, ""];

  let n = 0;

  for (const [group, items] of groups) {
    out.push(`## ${group} (${items.length})`, "");

    for (const r of items) {
      n += 1;
      out.push(`${n}. **${r.name}** — \`${r.file}\``, "", "   ```text", `   ${r.prompt}`, "   ```", "");
    }
  }

  return out.join("\n");
}

const SIZE_FULL = new Set(["tiny", "small"]);

export function creatureFraming(slug: string, size: string, type: string): Framing {
  if (SIZE_FULL.has(size) || /swarm/.test(slug) || type === "ooze") return "full";

  return "portrait";
}

const DRAGON_COLOURS: Record<string, { scales: string; breath: string }> = {
  black: { scales: "glossy black scales", breath: "a stream of green acid" },
  blue: { scales: "deep blue scales", breath: "a crackling bolt of lightning" },
  brass: { scales: "polished brass scales", breath: "a blast of hot desert fire" },
  bronze: { scales: "bronze scales", breath: "a crackling bolt of lightning" },
  copper: { scales: "copper scales with a green patina", breath: "a spray of green acid" },
  gold: { scales: "radiant gold scales", breath: "a blast of golden fire" },
  green: { scales: "emerald green scales", breath: "a cloud of poison gas" },
  red: { scales: "crimson red scales", breath: "a roaring blast of fire" },
  silver: { scales: "gleaming silver scales", breath: "a freezing blast of frost" },
  white: { scales: "pale white-blue scales", breath: "an icy blast of frost" },
};

const DRAGON_AGES: Record<string, string> = {
  wyrmling: "a small young dragon wyrmling",
  young: "a young dragon",
  adult: "a powerful adult dragon",
  ancient: "a colossal ancient dragon with scarred, weathered scales and a crown of horns",
};

export function dragonSubject(slug: string): string | null {
  const m = slug.match(/^(young|adult|ancient)-(\w+)-dragon$/) ?? slug.match(/^(\w+)-dragon-(wyrmling)$/);

  if (!m) return null;

  const [age, colour] = m[2] === "wyrmling" ? [m[2], m[1]] : [m[1], m[2]];

  const c = DRAGON_COLOURS[colour];

  if (!c || !DRAGON_AGES[age]) return null;

  return `${DRAGON_AGES[age]} with ${c.scales}, horned head, glowing eyes, leathery wings, ${c.breath} escaping from its jaws`;
}

const CUES: { test: RegExp; cue: string }[] = [
  { test: /tentacle/i, cue: "writhing tentacles" },
  { test: /constrict/i, cue: "coiling body" },
  { test: /web/i, cue: "spun webs" },
  { test: /breath/i, cue: "a breath attack escaping its mouth" },
  { test: /horn|gore/i, cue: "prominent horns" },
  { test: /tusk/i, cue: "large tusks" },
  { test: /pincer|claw/i, cue: "sharp claws" },
  { test: /sting|poison/i, cue: "a venomous stinger or fangs" },
];

export function featureCues(names: string[]): string {
  const hits = CUES.filter((c) => names.some((n) => c.test.test(n))).map((c) => c.cue);

  return hits.slice(0, 2).join(", ");
}

export interface CreatureInput {
  slug: string;
  name: string;
  size: string;
  type: string;
  fly: boolean;
  swim: boolean;
  featureNames: string[];
}

export function autoCreatureSubject(c: CreatureInput): string {
  const dragon = dragonSubject(c.slug);

  if (dragon) return dragon;

  const lower = c.name.toLowerCase();

  if (/^swarm of/.test(lower)) return `a dense swirling ${lower} filling the whole circle, individual animals in sharp detail`;

  const cues = featureCues(c.featureNames);

  const wings = c.fly && c.type === "beast" ? ", wings spread" : "";

  const extra = cues ? `, ${cues}` : "";

  if (c.type === "beast") return `a ${lower}, a realistic natural animal with fierce detailed anatomy${wings}${extra}`;

  return `a ${lower}, a ${c.size} ${c.type}${extra}`;
}

export interface SpellInput {
  name: string;
  school: string;
  damageTypes: string[];
  shapeType: string | null;
  desc: string;
}

const SHAPE_TEXT: Record<string, string> = {
  sphere: "spreading as a spherical burst",
  cube: "filling a cube-shaped area",
  cone: "sweeping outward in a cone",
  line: "streaking forward in a straight line",
};

export function srdSpellPalette(s: SpellInput): string {
  if (s.damageTypes[0] && PALETTES[s.damageTypes[0]]) return s.damageTypes[0];

  if (/regain[^.]*Hit Points/i.test(s.desc)) return "healing";

  return s.school;
}

export function autoSpellSubject(s: SpellInput): string {
  const first = s.desc.split(/(?<=\.)\s/)[0] ?? "";

  const visual = first
    .replace(/\bYou\b/g, "the caster")
    .replace(/\byour\b/gi, "their")
    .replace(/\bMake a[^.]*attack[^.]*\./i, "")
    .trim();

  const shape = s.shapeType ? `, ${SHAPE_TEXT[s.shapeType] ?? ""}` : "";

  return `the magical effect of ${s.name}${shape}: ${trimDot(visual).toLowerCase()}`;
}
