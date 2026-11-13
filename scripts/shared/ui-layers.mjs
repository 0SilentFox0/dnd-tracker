export const SYSTEM_UI_KIT = [
    '@/components/character-profile/ProfileContext',
    '@/components/character-profile/CombatRow',
    '@/components/rules/RulesSection',
    '@/components/rules/NumberField',
    '@/components/rules/RulesPaths',
    '@/components/battle/hud/DiceInput',
    '@/components/battle/wizards/attack/shared',
    '@/components/battle/participants/Section',
    '@/components/skill-tree/progression/ProgressionPanel',
    '@/components/spells/book/SpellBookPages',
    '@/components/characters/rest/CharacterPickList',
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const BOTTOM_COMMON = [
    '^@/(lib/(api|server)|systems)(/|$)',
    '^@/lib/hooks/(?!common(/|$))',
];

export const UI_LAYER_ZONES = [
    {
        name: 'ui',
        files: ['components/ui/**/*.{ts,tsx}'],
        forbidden: [
            '^@/components/(?!ui/|hud/fonts$|hud/surface$|hud/hud\\.css$)',
            '^@/types/',
            '^@/lib/utils/(?!common/)',
            ...BOTTOM_COMMON,
        ],
        message:
            'components/ui is the lowest UI layer: it may import only ui, hud/fonts, hud/surface and common lib code (docs/architecture/ui-layers.md)',
    },
    {
        name: 'hud',
        files: ['components/hud/**/*.{ts,tsx}'],
        forbidden: [
            '^@/components/(?!ui/|hud(/|$))',
            '^@/types/',
            '^@/lib/utils/(?!common/)',
            ...BOTTOM_COMMON,
        ],
        message:
            'components/hud may import only ui, hud and common lib code (docs/architecture/ui-layers.md)',
    },
    {
        name: 'common',
        files: ['components/common/**/*.{ts,tsx}'],
        forbidden: [
            '^@/components/(?!ui/|hud(/|$)|common/)',
            '^@/types/(?!theme$)',
            '^@/lib/utils/(?!common/|text/)',
            ...BOTTOM_COMMON,
        ],
        message:
            'components/common holds domain-free widgets: no domain components or types (docs/architecture/ui-layers.md)',
    },
    {
        name: 'system-ui',
        files: ['systems/*/ui/**/*.{ts,tsx}', 'systems/*/hooks/**/*.{ts,tsx}'],
        forbidden: [
            `^@/components/(?!(ui|hud|common)(/|$)|systems/types$|(${SYSTEM_UI_KIT.map((p) => escapeRe(p.slice('@/components/'.length))).join('|')})$)`,
        ],
        message:
            'system UI takes from core only ui/hud/common, components/systems/types and SYSTEM_UI_KIT (scripts/shared/ui-layers.mjs)',
    },
    {
        name: 'lib',
        files: ['lib/**/*.{ts,tsx}'],
        forbidden: ['^@/components/'],
        message:
            'lib must not import components (docs/architecture/ui-layers.md)',
    },
];

export const UI_LAYER_IGNORES = [
    '**/__tests__/**',
    '**/*.test.{ts,tsx}',
    'lib/i18n/test/**',
];
