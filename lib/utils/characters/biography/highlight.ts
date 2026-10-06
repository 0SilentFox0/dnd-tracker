export type BioSegment = { text: string; marked: boolean };

const MARK = /==([^=\n](?:[^\n]*?[^=\n])?)==/g;

export function parseHighlights(src: string): BioSegment[] {
  const out: BioSegment[] = [];

  let last = 0;

  for (const m of src.matchAll(MARK)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index), marked: false });

    out.push({ text: m[1], marked: true });
    last = m.index + m[0].length;
  }

  if (last < src.length) out.push({ text: src.slice(last), marked: false });

  return out;
}

export function toggleHighlight(src: string, start: number, end: number): { text: string; start: number; end: number } {
  for (const m of src.matchAll(MARK)) {
    const from = m.index + 2;

    const to = from + m[1].length;

    if (start >= from && end <= to) {
      return { text: src.slice(0, m.index) + m[1] + src.slice(m.index + m[0].length), start: m.index, end: m.index + m[1].length };
    }
  }

  let s = start;

  let e = end;

  while (s < e && /\s/.test(src[s])) s++;

  while (e > s && /\s/.test(src[e - 1])) e--;

  if (s === e) return { text: src, start, end };

  for (const m of src.matchAll(MARK)) {
    const mEnd = m.index + m[0].length;

    if (m.index < e && mEnd > s) {
      s = Math.min(s, m.index);
      e = Math.max(e, mEnd);
    }
  }

  const inner = src.slice(s, e).replaceAll("==", "");

  if (!inner.includes("\n")) {
    return { text: `${src.slice(0, s)}==${inner}==${src.slice(e)}`, start: s + 2, end: s + 2 + inner.length };
  }

  // marks never span lines (parseHighlights works per paragraph), so wrap each line on its own
  const wrapped = inner
    .split("\n")
    .map((line) => line.replace(/^(\s*)(\S(?:.*\S)?)(\s*)$/, "$1==$2==$3"))
    .join("\n");

  return { text: src.slice(0, s) + wrapped + src.slice(e), start: s, end: s + wrapped.length };
}

export function paragraphs(src: string): string[] {
  return src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
