export type Glossary = Record<string, string>;

const HEADER = /^(?:Level (\d+) (\S+)|(\S+) Cantrip) · Casting Time: (.+) · Range: (.+) · Components: (.+) · Duration: (.+) · Classes: (.+)$/;

const lowerFirst = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

const valueOf = (part: string) => part.slice(part.indexOf(": ") + 2);

// The spell header is mechanical: labels, school/level order and component letters are rebuilt from the glossary, the translated values are kept
export function normalizeSpellHeader(en: string, tr: string, glossary: Glossary): string {
  const enHead = en.split("\n")[0];

  const m = HEADER.exec(enHead);

  const [trHead, ...trRest] = tr.split("\n");

  const [trParts, labels] = [trHead.split(" · "), ["Casting Time", "Range", "Components", "Duration", "Classes"]];

  if (!m || trParts.length !== 6 || [...labels, "Level", "Cantrip"].some((k) => glossary[k] === undefined)) return tr;

  const school = glossary[m[2] ?? m[3]];

  if (school === undefined) return tr;

  if (trParts.slice(1).some((p) => !p.includes(": "))) return tr;

  const values = trParts.slice(1).map(valueOf);

  if (m[6].includes("(") && !values[2].includes("(")) return tr;

  const letters = m[6].split(" (")[0].split(", ").map((l) => glossary[l] ?? l).join(", ");

  const material = values[2].includes("(") ? ` (${values[2].slice(values[2].indexOf("(") + 1)}` : "";

  values[2] = `${letters}${material}`;

  const head = [m[1] ? `${glossary.Level} ${m[1]}, ${school}` : `${school}, ${glossary.Cantrip}`, ...labels.map((l, i) => `${glossary[l]}: ${l === "Classes" || l === "Components" ? values[i] : lowerFirst(values[i])}`)];

  return [head.join(" · "), ...trRest].join("\n");
}
