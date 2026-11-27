import { markdownToDoc } from '@/lib/utils/scenario/markdown';
import type { RichNode } from '@/types/scenario';

const textOf = (node: RichNode): string =>
    node.text ?? node.content?.map(textOf).join('') ?? '';

// the markdown parser only knows `###`; hand-typed `#`/`##` headings arrive as plain paragraphs
const HASH_HEADING = /^\s*#{1,6}\s/;

export function biographyLead(markdown: string | null): string | null {
    if (!markdown) return null;

    const first = markdownToDoc(markdown).content.find(
        (n) =>
            n.type === 'paragraph' &&
            textOf(n).trim() &&
            !HASH_HEADING.test(textOf(n))
    );

    return first ? textOf(first).replace(/\s+/g, ' ').trim() : null;
}
