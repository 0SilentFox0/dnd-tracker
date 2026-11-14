import { describe, expect, it, vi } from 'vitest';

import { SPELL_FX_BY_NAME } from '@/data/library/spell-fx-by-name';
import { SPELLS } from '@/data/library/spells';
import {
    PREVIEW_RULES,
    PREVIEW_SYSTEM_KEY,
} from '@/lib/utils/battle/fx/preview-rules';
import { previewSpellFx } from '@/lib/utils/battle/fx/spell-preview';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { metaOf } from '@/lib/utils/rules/systems/meta';

describe('PREVIEW_SYSTEM_KEY', () => {
    it('is the previewSandbox base regardless of key order', async () => {
        vi.resetModules();

        vi.doMock('@/lib/utils/rules/systems/meta', async (orig) => {
            const real =
                await orig<typeof import('@/lib/utils/rules/systems/meta')>();

            return {
                ...real,
                SYSTEM_META: [...real.SYSTEM_META].reverse(),
                RULE_SYSTEM_KEYS: [...real.RULE_SYSTEM_KEYS].reverse(),
            };
        });

        const mod = await import('@/lib/utils/battle/fx/preview-rules');

        vi.doUnmock('@/lib/utils/rules/systems/meta');

        expect(mod.PREVIEW_SYSTEM_KEY).toBe('dnd5e');
    });
});

describe('PREVIEW_RULES', () => {
    it('is a d20 base sandbox keyed by PREVIEW_SYSTEM_KEY', () => {
        expect(PREVIEW_RULES.system.key).toBe(PREVIEW_SYSTEM_KEY);
        expect(metaOf(PREVIEW_SYSTEM_KEY)?.kind ?? 'base').toBe('base');
        expect(ruleSystemOf(PREVIEW_RULES).combat.dice).toBe(20);
    });

    it('previews a fire spell into a spec', () => {
        const spell = SPELLS.find((s) => s.name === 'Вогняна куля')!;

        expect(
            previewSpellFx(spell, SPELL_FX_BY_NAME[spell.name]).spec
        ).toBeTruthy();
    });
});
