import { describe, expect, it } from 'vitest';

import { readSource, sources } from './helpers/source-files';

const READER_RE = /\.(equipped|stash)\b/;

// opaque ref movers and false positives — they never read an artifact behind a ref
const RAW_OK: Record<string, string> = {
    'lib/utils/artifacts/ownership.ts': 'ref-aware primitives (refArtifactIds)',
    'lib/utils/inventory/stash-actions.ts':
        'moves refs between equipped/stash as opaque strings',
    'lib/hooks/characters/useStash.ts': 'characterKeys.stash query key',
    'lib/hooks/characters/useCharacterEditor.ts':
        'seeds the DM editor state with raw refs',
    'lib/server/templates/sync/profile-refs.ts':
        'collects raw ids and refs of inventories for the sync-delete integrity check',
    'components/character-profile/ProfileEditor.tsx':
        'roster equipped is already resolved by read-roster',
};

describe('тест-сторож: читачі equipped/stash', () => {
    it('кожен читач поза lib/utils/items іде через lib/utils/items (resolveItemRows/heldRefs/…)', () => {
        const files = ['app', 'lib', 'components']
            .flatMap(sources)
            .filter((f) => !f.startsWith('lib/utils/items/'));

        const readers = files.filter((f) => READER_RE.test(readSource(f)));

        const bypass = readers.filter(
            (f) =>
                !RAW_OK[f] &&
                !/from ['"]@\/lib\/utils\/items\//.test(readSource(f))
        );

        expect(readers.length).toBeGreaterThan(10);
        expect(bypass).toEqual([]);
    });
});
