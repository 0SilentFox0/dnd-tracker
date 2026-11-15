import { describe, expect, it } from 'vitest';

import {
    composition,
    FALLBACK_SYSTEM_KEY,
    kindOf,
    moduleMetaOf,
} from '../catalog';
import { metaOf, RULE_SYSTEM_KEYS, type SystemMeta } from '../meta';

const NEW = ['deathsaves', 'inspiration', 'lair', 'offhand', 'opportunity'];

describe('dnd5e preset over the bare d20 base', () => {
    it('dnd5e is a preset of d20 with the new modules', () => {
        expect(composition({ key: 'dnd5e' })).toEqual({
            base: 'd20',
            modules: NEW,
        });

        expect(metaOf('dnd5e')?.kind).toBe('preset');
    });

    it('the bare d20 key is a base without modules', () => {
        expect(composition({ key: 'd20' })).toEqual({
            base: 'd20',
            modules: [],
        });

        expect(metaOf('d20')?.kind).toBe('base');
    });

    it('homm keeps its six modules and gains the new ones', () => {
        expect(composition({ key: 'homm' }).modules).toEqual(
            [
                'artifactsets',
                'heroscaling',
                'morale',
                'retaliation',
                'skilltrees',
                'unitstacks',
                ...NEW,
            ].sort()
        );
    });

    it('new modules are free addons of d20 with no keys', () => {
        for (const id of NEW) {
            const meta = moduleMetaOf(id);

            expect(kindOf(meta as SystemMeta)).toBe('addon');
            expect(meta?.requires).toEqual(['d20']);
            expect(meta?.toggle).toBe('free');
            expect(meta?.keys).toEqual([]);
        }
    });

    it('fallback key comes from meta, not from registry order', () => {
        expect(metaOf(FALLBACK_SYSTEM_KEY)?.fallback).toBe(true);
        expect(RULE_SYSTEM_KEYS).toContain(FALLBACK_SYSTEM_KEY);
        expect(composition({ key: FALLBACK_SYSTEM_KEY }).base).toBe('d20');
        expect(FALLBACK_SYSTEM_KEY).not.toBe(metaOf('d20')?.keys[0]);
    });
});
