export type TranslationIssue = "empty" | "numbers" | "dice" | "markup" | "lines" | "table-shape" | "table-prefix";

const tokens = (text: string, re: RegExp) => (text.match(re) ?? []).sort().join("\u0001");

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

const tableRows = (text: string) => text.split("\n").filter((l) => l.trimStart().startsWith("|"));

export function checkTranslation(en: string, tr: string): TranslationIssue[] {
  if (!tr.trim()) return ["empty"];

  const issues: TranslationIssue[] = [];

  if (tokens(en, /(?:(?<!\w)[+\u2212-])?\d+/g) !== tokens(tr, /(?:(?<!\w)[+\u2212-])?\d+/g)) issues.push("numbers");

  if (tokens(en.toLowerCase(), /\b\d*d\d+/g) !== tokens(tr.toLowerCase(), /\b\d*d\d+/g)) issues.push("dice");

  if (count(en, /\*/g) !== count(tr, /\*/g) || count(en, /`/g) !== count(tr, /`/g)) issues.push("markup");

  if (count(en, /\n/g) !== count(tr, /\n/g)) issues.push("lines");

  const [enRows, trRows] = [tableRows(en), tableRows(tr)];

  if (enRows.length !== trRows.length || enRows.some((row, i) => count(row, /\|/g) !== count(trRows[i], /\|/g))) issues.push("table-shape");

  if (/^Table: /m.test(en) !== /^Table: /m.test(tr)) issues.push("table-prefix");

  return issues;
}
