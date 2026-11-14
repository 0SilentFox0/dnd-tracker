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

    it('a flag of a module outside the installed set is described as unknown, not thrown', async () => {
        const { install, flags } = await load();

        install.installAbilityModules({ d20: D20_ABILITY_MODULE });

        const { MORALE_FLAG_SCHEMAS } = await import(
            '@/systems/morale/rules/ability-flags'
        );

        const flag = MORALE_FLAG_SCHEMAS[0].shape.flag.value;

        expect(flags.FLAG_REGISTRY).not.toHaveProperty(flag);
        expect(flags.describeFlag({ kind: 'flag', flag } as never)).toEqual([
            { key: 'summary.unknownEffect', params: { kind: flag } },
        ]);
    });

    it('one module alone fills its derived tables without the rules root', async () => {
        const { install, effects, flags, vars } = await load();

        install.installAbilityModules({ morale: MORALE_ABILITY_MODULE });

        expect(effects.EFFECT_REGISTRY).toHaveProperty('changeMorale');
        expect(flags.FLAG_KEYS.length).toBeGreaterThan(0);
        expect(Object.keys(flags.FLAG_FIELDS).length).toBe(
            flags.FLAG_KEYS.length
        );
        expect(vars.ABILITY_VARIABLES).toHaveProperty('morale');
    });

    it('the server engine throws on an effect kind it has no definition for', async () => {
        const { install, effects } = await load();

        install.installAbilityModules({ wfrp: WFRP_ABILITY_MODULE });

        expect(() =>
            effects.applyEffect({
                effect: { kind: 'changeMorale' },
                participants: [],
                ctx: { rules: { system: { key: 'wfrp' } } },
            } as never)
        ).toThrow('changeMorale');
    });
});

describe('schema and rows stay in step', () => {
    it('every flag and effect kind a schema accepts has a row after the rules root', async () => {
        await import('@/lib/utils/rules/systems/registry');

        const { SYSTEM_FLAG_SCHEMAS } = await import(
            '@/lib/utils/abilities/schema/system-flags'
        );

        const { SYSTEM_EFFECT_SCHEMAS } = await import(
            '@/lib/utils/abilities/schema/system-effects'
        );

        const { MODULE_EFFECT_SCHEMAS } = await import(
            '@/lib/utils/abilities/schema/module-effects'
        );

        const { FLAG_REGISTRY } = await import(
            '@/lib/utils/abilities/registry/effects/flags'
        );

        const { EFFECT_REGISTRY } = await import(
            '@/lib/utils/abilities/registry/effects'
        );

        const flags = SYSTEM_FLAG_SCHEMAS.map((z) => z.shape.flag.value);

        const kinds = [...SYSTEM_EFFECT_SCHEMAS, ...MODULE_EFFECT_SCHEMAS].map(
            (z) => z.shape.kind.value
        );

        expect(flags.filter((f) => !(f in FLAG_REGISTRY))).toEqual([]);
        expect(kinds.filter((k) => !(k in EFFECT_REGISTRY))).toEqual([]);
    });
});
