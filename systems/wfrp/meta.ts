import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const WFRP_META = {
    module: 'wfrp',
    kind: 'base',
    keys: ['wfrp'],
    tokens: ['wfrp'],
    distance: { unit: 'yd', perCell: 2 },
    i18n: {
        battle: ['battleWfrp'],
        campaign: ['wfrpMagic', 'wfrpAdvancement'],
        member: ['wfrpEquipment'],
        dm: [
            'wfrpCareers',
            'wfrpCreation',
            'wfrpEquipmentEditor',
            'wfrpTraits',
            'wfrpTables',
        ],
        pages: {
            character: ['wfrpDowntime', 'wfrpCorruption'],
            draft: ['wfrpCreation'],
            dmCharacter: ['wfrpDowntime', 'wfrpCorruption'],
            dmCharacters: ['wfrpDowntime'],
            dmRules: ['battleWfrp', 'wfrpDowntime', 'wfrpCorruption'],
        },
        budgetKb: {
            battle: 118.2,
            member: 121.2,
            // W8 gear texts, world layers/errors messages and W9 reactive Dispel labels, the canon-tech epic (P1-P12) the system editor fields, the Ch5 character sheet keys and the Ch6 HUD/hex keys grew the wfrp scopes past their old budgets
            dm: 126.6,
            pages: { character: 4, dmCharacter: 4, dmCharacters: 2 },
        },
    },
    whatsNew: [
        {
            id: '2026-11-20-wfrp-creation',
            date: '2026-11-20',
            audience: 'all',
        },
        {
            id: '2026-11-20-wfrp-advancement',
            date: '2026-11-20',
            audience: 'all',
        },
        {
            id: '2026-11-20-wfrp-downtime-5e',
            date: '2026-11-20',
            audience: 'all',
        },
        {
            id: '2026-11-20-wfrp-psychology',
            date: '2026-11-20',
            audience: 'all',
        },
        {
            id: '2026-11-20-wfrp-fate-fortune',
            date: '2026-11-20',
            audience: 'all',
        },
        {
            id: '2026-11-09-wfrp-corruption',
            date: '2026-11-09',
            audience: 'all',
        },
        { id: '2026-11-08-wfrp-downtime', date: '2026-11-08', audience: 'all' },
        {
            id: '2026-11-06-wfrp-careers',
            date: '2026-11-06',
            audience: 'dm',
            href: '/help/dm-rule-systems',
        },
        {
            id: '2026-11-05-wfrp-advancement',
            date: '2026-11-05',
            audience: 'all',
        },
        {
            id: '2026-11-05-wfrp-magic',
            date: '2026-11-05',
            audience: 'dm',
            href: '/help/dm-rule-systems',
        },
        {
            id: '2026-11-04-rule-system-wfrp',
            date: '2026-11-04',
            audience: 'dm',
            href: '/help/dm-rule-systems',
        },
    ],
    dmSections: ['careers'],
    contentKinds: ['careers'],
    emptyCharacteristicsHashes: ['b4fa5afbf9ba101ee9ddc0c6cee20709f1e8785a'],
} as const satisfies SystemMeta;
