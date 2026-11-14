import { beforeEach, describe, expect, it, vi } from 'vitest';

import { D20_ABILITY_MODULE } from '@/systems/d20/rules/ability-install';
import { MORALE_ABILITY_MODULE } from '@/systems/morale/rules/ability-install';
import { WFRP_ABILITY_MODULE } from '@/systems/wfrp/rules/ability-install';

// the global setup installs everything; each test starts from an empty store
beforeEach(() => {
    vi.resetModules();
});

const load = async () => ({
    install: await import('@/lib/utils/abilities/registry/install'),
    effects: await import('@/lib/utils/abilities/registry/effects'),
    flags: await import('@/lib/utils/abilities/registry/effects/flags'),
    rows: await import('@/lib/utils/abilities/registry/effects/system-rows'),
    vars: await import('@/lib/utils/abilities/engine/core/variables'),
});

describe('ability modules install', () => {
    it('has no system kinds, flags or variables before install', async () => {
        const { effects, flags, rows, vars } = await load();

        expect(effects.EFFECT_REGISTRY).not.toHaveProperty('wfrpWard');
        expect(flags.FLAG_KEYS).not.toContain('saveProficiency');
        expect(rows.isSystemEffectKind('wfrpWard')).toBe(false);
        expect(vars.ABILITY_VARIABLES).not.toHaveProperty('morale');
    });

    it('installs only the given modules and merges later installs in place', async () => {
        const { install, effects, flags, rows, vars } = await load();

        install.installAbilityModules({ wfrp: WFRP_ABILITY_MODULE });

        expect(effects.EFFECT_REGISTRY).toHaveProperty('wfrpWard');
        expect(rows.SYSTEM_EFFECT_OWNERSHIP.kinds.wfrpWard).toBe('wfrp');
        expect(flags.FLAG_KEYS).not.toContain('saveProficiency');
        expect(vars.ABILITY_VARIABLES).not.toHaveProperty('str_mod');

        const keysRef = flags.FLAG_KEYS;

        install.installAbilityModules({
            d20: D20_ABILITY_MODULE,
            morale: MORALE_ABILITY_MODULE,
        });

        expect(flags.FLAG_KEYS).toBe(keysRef);
        expect(flags.FLAG_KEYS).toContain('saveProficiency');
        expect(effects.EFFECT_REGISTRY).toHaveProperty('wfrpWard');
        expect(effects.EFFECT_REGISTRY).toHaveProperty('changeMorale');
        expect(vars.ABILITY_VARIABLES).toHaveProperty('morale');
        expect(vars.FORMULA_VARIABLE_NAMES).toContain('str_mod');
    });

    it('installing the same modules twice does not notify again', async () => {
        const { install } = await load();

        const listener = vi.fn();

        install.installAbilityModules({ d20: D20_ABILITY_MODULE });
        install.onAbilityInstall(listener);
        install.installAbilityModules({ d20: D20_ABILITY_MODULE });

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
