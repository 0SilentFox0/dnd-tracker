import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const SKILLTREES_META = {
    module: 'skilltrees',
    kind: 'addon',
    keys: [],
    aliases: ['skillTree'],
    requires: ['d20'],
    toggle: 'setup',
    i18n: { campaign: ['skillTree'] },
    dmSections: ['skills', 'skill-trees'],
    contentKinds: ['main-skills', 'skills'],
    contentTables: [
        {
            key: 'mainSkills',
            model: 'MainSkill',
            delegate: 'mainSkill',
            kind: 'main-skills',
            order: 10,
            detach: 'mainSkill',
        },
        { key: 'skills', model: 'Skill', delegate: 'skill', order: 11 },
        {
            key: 'skillTrees',
            model: 'SkillTree',
            delegate: 'skillTree',
            order: 12,
            detach: 'skillTree',
            erasesProgress: true,
        },
    ],
    detachRefs: [
        { kind: 'spellGroup', model: 'mainSkill', column: 'spellGroupId' },
        { kind: 'spellGroup', model: 'skill', column: 'spellGroupId' },
        { kind: 'mainSkill', model: 'skill', column: 'mainSkillId' },
        { kind: 'spell', model: 'skill', column: 'spellId' },
        { kind: 'spell', model: 'skill', column: 'spellNewSpellId' },
        { kind: 'spell', model: 'skill', column: 'grantedSpellId' },
        {
            kind: 'skillTree',
            model: 'characterSkills',
            column: 'skillTreeId',
            cascade: true,
            viaCharacter: true,
        },
    ],
} as const satisfies SystemMeta;
