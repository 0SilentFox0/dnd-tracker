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

  const inner = src.slice(s, e).replaceAll("==", "");

  return { text: `${src.slice(0, s)}==${inner}==${src.slice(e)}`, start: s + 2, end: s + 2 + inner.length };
}

export function paragraphs(src: string): string[] {
  return src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
