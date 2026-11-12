import type { SystemEffectRowInput } from '@/lib/utils/abilities/registry/effects/system-row';
import type { FieldMeta } from '@/lib/utils/abilities/registry/fields';
import { seg, type Segment } from '@/lib/utils/abilities/segments';
import type { WfrpEffect } from '@/systems/wfrp/rules/ability-effects';
import {
    PSYCHOLOGY_KINDS,
    TRAIT_ATTACKS,
    TRAIT_SIZES,
} from '@/systems/wfrp/rules/trait-kinds';

type Of<K extends WfrpEffect['kind']> = Extract<WfrpEffect, { kind: K }>;

const num = (name: string, optional?: boolean): FieldMeta => ({
    name,
    input: 'number',
    ...(optional && { optional }),
});

const options = (values: readonly string[]) =>
    values.map((value) => ({ value }));

const apply = (input: { participants: unknown }) =>
    ({ participants: input.participants, messages: [] }) as never;

const armour = {
    kind: 'wfrpArmour',
    row: {
        kind: 'wfrpArmour',
        static: true,
        pickable: false,
        fields: [num('head'), num('body'), num('arm'), num('leg')],
        describe: (e: Of<'wfrpArmour'>): Segment[] => [
            seg('summary.effects.wfrpArmour', {
                head: e.head,
                arm: e.arm,
                body: e.body,
                leg: e.leg,
            }),
        ],
        apply,
    },
    defaults: { head: 0, body: 0, arm: 0, leg: 0 },
} as const;

const ward = {
    kind: 'wfrpWard',
    row: {
        kind: 'wfrpWard',
        static: true,
        pickable: false,
        fields: [num('value')],
        describe: (e: Of<'wfrpWard'>): Segment[] => [
            seg('summary.effects.wfrpWard', { value: e.value }),
        ],
        apply,
    },
    defaults: { value: 9 },
} as const;

const size = {
    kind: 'wfrpSize',
    row: {
        kind: 'wfrpSize',
        static: true,
        pickable: false,
        fields: [
            { name: 'size', input: 'select', options: options(TRAIT_SIZES) },
        ],
        describe: (e: Of<'wfrpSize'>): Segment[] => [
            seg('summary.effects.wfrpSize', {
                size: seg(`effects.wfrpSize.options.size.${e.size}`),
            }),
        ],
        apply,
    },
    defaults: { size: 'large' },
} as const;

const psychology = {
    kind: 'wfrpPsychology',
    row: {
        kind: 'wfrpPsychology',
        static: true,
        pickable: false,
        fields: [
            {
                name: 'psychology',
                input: 'select',
                options: options(PSYCHOLOGY_KINDS),
            },
            num('value'),
        ],
        describe: (e: Of<'wfrpPsychology'>): Segment[] => [
            seg('summary.effects.wfrpPsychology', {
                psychology: seg(
                    `effects.wfrpPsychology.options.psychology.${e.psychology}`
                ),
                value: e.value,
            }),
        ],
        apply,
    },
    defaults: { psychology: 'fear', value: 1 },
} as const;

const attack = {
    kind: 'wfrpAttack',
    row: {
        kind: 'wfrpAttack',
        static: true,
        pickable: false,
        fields: [
            {
                name: 'attack',
                input: 'select',
                options: options(TRAIT_ATTACKS),
            },
            num('damage'),
            {
                ...num('rangeFt', true),
                visibleWhen: (v: Record<string, unknown>) =>
                    v.attack === 'breath' || v.attack === 'ranged',
            },
            { name: 'magical', input: 'toggle', optional: true },
        ],
        describe: (e: Of<'wfrpAttack'>): Segment[] => [
            seg('summary.effects.wfrpAttack', {
                attack: seg(`effects.wfrpAttack.options.attack.${e.attack}`),
                damage: e.damage,
                magical: e.magical ? 'yes' : 'no',
            }),
        ],
        apply,
    },
    defaults: { attack: 'bite', damage: 3 },
} as const;

export const WFRP_EFFECT_ROWS = [
    armour,
    ward,
    size,
    psychology,
    attack,
] as const satisfies readonly SystemEffectRowInput[];
