import { describe, expect, it } from 'vitest';

import {
    CONTENT_KINDS,
    CORE_CONTENT_KINDS,
} from '@/lib/constants/content-kinds';
import {
    contentKindsOf,
    kindOf,
    ownerOfContentKind,
} from '@/lib/utils/rules/systems/catalog';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

const core = new Set<string>(CORE_CONTENT_KINDS);

const METAS: readonly SystemMeta[] = SYSTEM_META;

describe('content kind ownership', () => {
    it('every dictionary kind outside the core has exactly one owner', () => {
        for (const kind of CONTENT_KINDS) {
            const owners = METAS.filter((m) => m.contentKinds?.includes(kind));

            expect(owners, kind).toHaveLength(core.has(kind) ? 0 : 1);
        }
    });

    it('owners are bases or addons and declare only dictionary kinds', () => {
        for (const meta of METAS) {
            const kinds = meta.contentKinds ?? [];

            if (kinds.length > 0)
                expect(['base', 'addon']).toContain(kindOf(meta));

            for (const kind of kinds)
                expect(CONTENT_KINDS as readonly string[]).toContain(kind);
        }
    });

    it('ownerOfContentKind finds the module', () => {
        expect(ownerOfContentKind('careers')).toBe('wfrp');
        expect(ownerOfContentKind('main-skills')).toBe('skilltrees');
        expect(ownerOfContentKind('units')).toBeUndefined();
    });

    it('a bare dnd5e has classes but no skill trees', () => {
        const kinds = contentKindsOf({ key: 'dnd5e' });

        expect(kinds.has('classes')).toBe(true);
        expect(kinds.has('main-skills')).toBe(false);
        expect(kinds.has('careers')).toBe(false);
    });

    it('homm has every kind except careers', () => {
        const kinds = contentKindsOf({ key: 'homm' });

        for (const kind of CONTENT_KINDS)
            expect(kinds.has(kind), kind).toBe(kind !== 'careers');
    });

    it('wfrp is the core plus careers', () => {
        expect([...contentKindsOf({ key: 'wfrp' })].sort()).toEqual(
            [...CORE_CONTENT_KINDS, 'careers'].sort()
        );
    });
});
