import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const D20_META = {
    module: 'd20',
    kind: 'base',
    previewSandbox: true,
    keys: ['d20'],
    tokens: ['dnd5e'],
    distance: { unit: 'ft', perCell: 5 },
    i18n: {
        battle: ['battleD20'],
        legacyKeys: {
            'battleLog.attack.thorns': 'battleD20.attack.thorns',
            'battleLog.turn.hotTemp': 'battleD20.turn.hotTemp',
            'battleLog.reject.cannotCast': 'battleD20.reject.cannotCast',
            'battleLog.spellFx.teleport': 'battleD20.spellFx.teleport',
            'battleLog.spellFx.teleportBlocked':
                'battleD20.spellFx.teleportBlocked',
            'battleLog.mastery.': 'battleD20.mastery.',
            'battleLog.rider.': 'battleD20.rider.',
            'abilityText.log.regenSuppressed':
                'battleD20.abilityLog.regenSuppressed',
            'abilityText.log.hotTemp': 'battleD20.abilityLog.hotTemp',
            'abilityText.log.maxHpBoost': 'battleD20.abilityLog.maxHpBoost',
        },
        budgetKb: { battle: 111 },
    },
    dmSections: ['classes', 'backgrounds'],
    contentKinds: ['classes', 'backgrounds'],
    characteristicsColumns: [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
        'armorClass',
        'initiative',
        'speed',
    ],
} as const satisfies SystemMeta;
