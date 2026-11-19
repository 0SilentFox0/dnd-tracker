const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const letter = (s: string) => {
    const first = segmenter.segment(s.trim())[Symbol.iterator]().next();

    return first.done ? '' : first.value.segment.toLocaleUpperCase();
};

export function avatarInitials(
    name?: string | null,
    email?: string | null
): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) return letter(words[0]) + letter(words[1]);

    if (words.length === 1) return letter(words[0]);

    const local = (email ?? '').split('@')[0]?.trim() ?? '';

    return local ? letter(local) : '?';
}

export function avatarHue(id: string): number {
    let h = 0;

    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;

    return h % 360;
}
