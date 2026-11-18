import { renderEntryBlocks } from '../../entries';
import { nestedId } from '../../identity';
import { mediaIdOf, type MediaRef } from '../../media/types';
import { type Adapter } from '../../types';
import { str } from '../shared';

import { buildSearchText } from '@/lib/utils/scenario/search-text';
import type { RichNode, ScenarioContent } from '@/types/scenario';

export const materialPage: Adapter = (row, ctx) => {
    const rendered = renderEntryBlocks(row.entries ?? row, ctx.path);

    ctx.issues.push(...rendered.issues);

    const id = nestedId(ctx.key);

    const nodes: RichNode[] = [];

    const media: MediaRef[] = [];

    for (const block of rendered.blocks) {
        if ('text' in block) {
            nodes.push({
                type: 'paragraph',
                content: [{ type: 'text', text: block.text }],
            });

            continue;
        }

        const { url, alt, caption, path, skip } = block.image;

        if (skip) {
            media.push({ url, role: 'inline', path, skip });

            continue;
        }

        const mediaId = mediaIdOf(url);

        nodes.push({
            type: 'image',
            attrs: {
                mediaId,
                ...(alt && { alt }),
                ...(caption && { caption }),
            },
        });
        media.push({ url, role: 'inline', path, mediaId, ...(alt && { alt }) });
    }

    const content: ScenarioContent = {
        legend: [],
        sections: [
            {
                id,
                title: str(row.name) || ctx.t('derived.material'),
                played: false,
                rows: [
                    {
                        id: `${id}-row`,
                        story: { type: 'doc', content: [] },
                        notes: { type: 'doc', content: nodes },
                    },
                ],
            },
        ],
    };

    return {
        kind: 'scenarioPages',
        body: {
            kind: 'note',
            status: 'draft',
            characterId: null,
            title: row.name,
            content,
            searchText: buildSearchText(str(row.name), content),
            version: 0,
        },
        notes: '',
        ...(media.length > 0 && { media }),
    };
};
