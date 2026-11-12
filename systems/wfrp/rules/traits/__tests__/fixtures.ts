import type { Effect, Trigger } from '@/lib/utils/abilities/schema';
import type { ResolvedAbility } from '@/types/abilities';

export function trait(
    effects: unknown[],
    over: Partial<ResolvedAbility> = {}
): ResolvedAbility {
    const trigger: Trigger = { event: 'passive' };

    return {
        id: 'a1',
        key: 'a1',
        name: 'Trait',
        trigger,
        effects: effects as Effect[],
        source: { kind: 'unit' } as never,
        ...over,
    };
}

export function must<T>(value: T | undefined | null, what = 'value'): T {
    if (value == null) throw new Error(`missing ${what}`);

    return value;
}
