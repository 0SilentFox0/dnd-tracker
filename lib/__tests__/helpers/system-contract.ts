import { expect } from 'vitest';

import type { SystemUi } from '@/components/systems/types';
import { CHARACTER_SYSTEM_COLUMNS } from '@/lib/constants/stat-columns';
import type { SystemServer } from '@/lib/server/systems/types';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems';
import type { SystemMeta } from '@/lib/utils/rules/systems/meta';
import { statColumnFillOf } from '@/lib/utils/rules/systems/stats';

const NULLABLE_COLUMNS: readonly string[] = ['subclass', 'archetype'];

const FLAGS = ['lineage', 'attacks', 'spells', 'items', 'inventory'] as const;

export function assertSystemContract(
    meta: SystemMeta,
    definition: RuleSystemDefinition,
    ui: SystemUi,
    server: SystemServer
): void {
    expect(meta.module).toMatch(/^[a-z0-9]+$/);
    expect(meta.keys.length).toBeGreaterThan(0);
    expect(new Set(meta.keys).size).toBe(meta.keys.length);
    expect(meta.keys).toContain(definition.key);

    if (meta.kind === undefined || meta.kind === 'base') {
        expect(['ft', 'yd']).toContain(meta.distance?.unit);
        expect(meta.distance?.perCell).toBeGreaterThan(0);
    }

    expect(typeof definition.progression.levels).toBe('boolean');
    expect(['hp', 'wounds']).toContain(definition.progression.hpTerm);
    expect(typeof definition.progression.maxHp).toBe('function');
    for (const flag of FLAGS) expect(typeof definition[flag]).toBe('boolean');
    expect(Array.isArray(definition.stats?.columns ?? [])).toBe(true);
    for (const part of definition.stats?.columns ?? [])
        for (const column of part.owns)
            expect(CHARACTER_SYSTEM_COLUMNS).toContain(column);

    const owned = (definition.stats?.columns ?? []).flatMap(
        (part) => part.owns
    );

    expect(new Set(owned).size).toBe(owned.length);

    if (definition.characteristics.persisted) {
        const covered = new Set([
            ...owned,
            ...Object.keys(statColumnFillOf(definition, DEFAULT_RULES)),
            ...NULLABLE_COLUMNS,
        ]);

        expect(
            CHARACTER_SYSTEM_COLUMNS.filter((column) => !covered.has(column))
        ).toEqual([]);
    }

    expect(typeof definition.identity.alignments).toBe('boolean');
    expect(typeof definition.rest.kinds).toBe('boolean');
    expect(typeof definition.sheetTest.accepts).toBe('function');
    expect(typeof definition.sheetTest.roll).toBe('function');

    const { characteristics, combat } = definition;

    expect(characteristics.isEmpty(null)).toBe(true);
    expect(characteristics.isEmpty(undefined)).toBe(true);
    expect(typeof characteristics.sheetBlock).toBe('function');

    const defaults = characteristics.defaults();

    expect(defaults === undefined || typeof defaults === 'object').toBe(true);

    if (characteristics.persisted)
        expect(server.schemas.characteristics).toBeDefined();
    else expect(defaults).toBeUndefined();

    expect(['client', 'server']).toContain(combat.judge);
    expect(combat.dice).toBeGreaterThan(1);
    expect(typeof combat.actionEconomy.bonusAction).toBe('boolean');
    expect(typeof combat.actionEconomy.reaction).toBe('boolean');

    expect(typeof combat.resolveAttack).toBe('function');
    expect(typeof combat.abortedRoll).toBe('function');

    for (const hook of [combat.initiative, combat.tieBreak, combat.damage])
        expect(typeof hook).toBe('function');

    expect(combat.hitModel.refHit).toBeGreaterThan(0);

    for (const hook of [
        combat.actions.enabled,
        combat.actions.available,
        combat.actions.run,
        combat.actions.move,
        combat.reactions.blocker,
    ])
        expect(typeof hook).toBe('function');

    expect(typeof combat.actions.catalog).toBe('object');

    expect(typeof definition.conditionSet?.apply).toBe('function');
    expect(typeof definition.conditionSet?.effectInput).toBe('function');

    expect(typeof definition.magic.saveDc).toBe('function');
    expect(typeof definition.magic.upcast.steps).toBe('function');

    if (definition.conditions)
        expect(definition.conditions.catalog.length).toBeGreaterThan(0);

    for (const component of [
        ui.HeroStats,
        ui.StatsTab,
        ui.RollDialogBody,
        ui.StatsFields,
        ui.UnitStatsFields,
    ])
        expect(typeof component).toBe('function');

    expect(typeof ui.hideProgression).toBe('boolean');
    expect(ui.hideProgression).toBe(!definition.progression.levels);

    if (definition.downtime) expect(ui.DowntimeTab).toBeDefined();

    if (definition.creation) expect(ui.DraftForm).toBeDefined();

    expect(typeof server.schemas).toBe('object');

    if (server.ai?.heroSelect) expect(server.ai.hero).toBeDefined();
}
