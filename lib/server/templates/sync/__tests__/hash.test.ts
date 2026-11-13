import { describe, expect, it } from 'vitest';

import { layeredModels } from '@/lib/db/layer/config';
import { BUNDLE_TABLES, emptyBundle } from '@/lib/server/templates/bundle';
import {
    baselineFromBundle,
    mechanicKeysOf,
    rowHash,
    rulesHashes,
    settingsHash,
} from '@/lib/server/templates/sync/hash';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { contentRowHash } from '@/lib/utils/content/row-hash';
import { MECHANIC_REGISTRY } from '@/lib/utils/rules/registry';
import { parseRules } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const spells = BUNDLE_TABLES.find((t) => t.key === 'spells')!;

const SYS = { system: { key: 'homm' } };

describe('sync hashes', () => {
    it('rowHash ignores columns outside the bundle', () => {
        const row = { id: 'c' + 'a'.repeat(24), name: 'Fireball' };

        expect(
            rowHash({ ...row, sourceId: 'x', campaignId: 'y' }, spells)
        ).toBe(rowHash(row, spells));
    });

    it('feat rowHash ignores null xpCost/maxRank but reacts to values', () => {
        const feats = BUNDLE_TABLES.find((t) => t.key === 'feats')!;

        const row = {
            id: 'c' + 'a'.repeat(24),
            name: 'Grappler',
            repeatable: false,
        };

        expect(rowHash({ ...row, xpCost: null, maxRank: null }, feats)).toBe(
            rowHash(row, feats)
        );
        expect(rowHash({ ...row, xpCost: 100, maxRank: null }, feats)).not.toBe(
            rowHash(row, feats)
        );
    });

    it('artifact rowHash ignores null systemStats but reacts to values', () => {
        const artifacts = BUNDLE_TABLES.find((t) => t.key === 'artifacts')!;

        expect(artifacts.columns).toContain('systemStats');

        const row = { id: 'c' + 'a'.repeat(24), name: 'Mail', slot: 'armor' };

        expect(rowHash({ ...row, systemStats: null }, artifacts)).toBe(
            rowHash(row, artifacts)
        );
        expect(
            rowHash(
                {
                    ...row,
                    systemStats: {
                        type: 'gear',
                        weight: 1,
                        price: 1,
                        qualities: [],
                    },
                },
                artifacts
            )
        ).not.toBe(rowHash(row, artifacts));
    });

    it('materialized sourceHash (hashColumns of a base row, nulls included) equals rowHash of the same source', () => {
        for (const t of BUNDLE_TABLES) {
            const base = Object.fromEntries(
                layeredModels()[t.model].hashColumns.map((c) => [c, null])
            );

            const materialized = contentRowHash(
                t.model,
                Object.fromEntries(
                    layeredModels()
                        [t.model].hashColumns.filter((c) => c in base)
                        .map((c) => [c, base[c]])
                )
            );

            expect(materialized, t.key).toBe(rowHash(base, t));
        }
    });

    it('rowHash reacts to ingredients and componentFlags', () => {
        const row = {
            id: 'c' + 'a'.repeat(24),
            name: 'Revivify',
            ingredients: [],
            componentFlags: null,
        };

        const diamond = {
            name: 'Diamond',
            qty: 1,
            minGp: 300,
            consumed: true,
            focus: false,
        };

        expect(spells.columns).toEqual(
            expect.arrayContaining(['ingredients', 'componentFlags'])
        );
        expect(rowHash({ ...row, ingredients: [diamond] }, spells)).not.toBe(
            rowHash(row, spells)
        );
        expect(
            rowHash(
                { ...row, componentFlags: { v: true, s: true, m: true } },
                spells
            )
        ).not.toBe(rowHash(row, spells));
    });

    it('rulesHashes covers every mechanic of the composition and treats {} as defaults', () => {
        const h = rulesHashes(SYS);

        expect(Object.keys(h).sort()).toEqual(mechanicKeysOf(SYS).sort());
        expect(
            Object.keys(rulesHashes(WFRP_RULES)).every(
                (k) => k in MECHANIC_REGISTRY
            )
        ).toBe(true);
        expect(
            rulesHashes({ system: { key: 'dnd5e', modules: ['morale'] } })
                .morale
        ).toBe(
            hashJson(
                parseRules({ system: { key: 'dnd5e', modules: ['morale'] } })
                    .morale
            )
        );
    });

    it('rulesHashes does not treat system as a mechanic', () => {
        expect(Object.keys(rulesHashes(WFRP_RULES))).not.toContain('system');
    });

    it('rulesHashes keys follow the composition; modules on/off', () => {
        const off = rulesHashes({ system: { key: 'dnd5e', modules: [] } });

        const on = rulesHashes({
            system: { key: 'dnd5e', modules: ['morale'] },
        });

        expect(off).not.toHaveProperty('morale');
        expect(on.morale).toBe(
            hashJson(
                parseRules({ system: { key: 'dnd5e', modules: ['morale'] } })
                    .morale
            )
        );
        expect(Object.keys(on)).toEqual(
            expect.arrayContaining(Object.keys(off))
        );
    });

    it('rulesHashes ignores unknown keys', () => {
        const base = rulesHashes(SYS);

        expect(rulesHashes({ ...SYS, unknownSection: { a: 1 } })).toEqual(base);
        expect(rulesHashes({ ...SYS, morale: { bogusKey: 1 } })).toEqual(
            rulesHashes({ ...SYS, morale: {} })
        );
    });

    it('every preset keeps the pre-composition hash for each key it still covers', () => {
        for (const key of ['dnd5e', 'homm', 'wfrp']) {
            const rules = { system: { key } };

            const parsed = parseRules(rules) as Record<string, unknown>;

            for (const [k, h] of Object.entries(rulesHashes(rules)))
                expect(h, `${key}.${k}`).toBe(hashJson(parsed[k]));
        }
    });

    it('mechanicKeysOf never includes system', () => {
        expect(mechanicKeysOf(SYS)).not.toContain('system');
    });

    it('settingsHash depends only on the four settings', () => {
        const s = {
            maxLevel: 20,
            xpMultiplier: 2.5,
            allowPlayerEdit: true,
            friendlyFire: false,
        };

        expect(settingsHash({ ...s })).toBe(settingsHash(s));
        expect(settingsHash({ ...s, maxLevel: 10 })).not.toBe(settingsHash(s));
    });

    it('baselineFromBundle keeps table hashes and adds rules/settings', () => {
        const b = { ...emptyBundle(), rules: SYS };

        const base = baselineFromBundle(b, { spells: { a: 'h1' } });

        expect(base.tables).toEqual({ spells: { a: 'h1' } });
        expect(base.rules).toEqual(rulesHashes(b.rules));
        expect(base.settings).toBe(settingsHash(b.settings));
    });
});
