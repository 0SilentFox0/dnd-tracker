import { markdownToDoc } from '@/lib/utils/scenario/markdown';
import type { RichNode } from '@/types/scenario';

const textOf = (node: RichNode): string =>
    node.text ?? node.content?.map(textOf).join('') ?? '';

export function biographyLead(markdown: string | null): string | null {
    if (!markdown) return null;

    const first = markdownToDoc(markdown).content.find(
        (n) => n.type === 'paragraph' && textOf(n).trim()
    );

    return first ? textOf(first).replace(/\s+/g, ' ').trim() : null;
}
