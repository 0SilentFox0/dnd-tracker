import type {
    Fixture,
    O5Feat,
    O5FeatBenefit,
    O5Spell,
    Open5eData,
} from '../lib/open5e';

const spell = (pk: string, fields: O5Spell): Fixture<O5Spell> => ({
    model: 'api_v2.spell',
    pk,
    fields,
});

export const EXTRA_SPELLS: Fixture<O5Spell>[] = [
    spell('extra_armor-of-agathys', {
        name: 'Armor of Agathys',
        desc: 'Protective magical frost surrounds you. You gain 5 Temporary Hit Points. If a creature hits you with a melee attack roll before the spell ends, the creature takes 5 Cold damage. The spell ends early if you have no Temporary Hit Points.',
        level: 1,
        school: 'abjuration',
        higher_level:
            'Both the Temporary Hit Points and the Cold damage increase by 5 for each spell slot level above 1.',
        range_text: 'Self',
        range: 0,
        ritual: false,
        casting_time: 'action',
        verbal: true,
        somatic: true,
        material: true,
        material_specified: 'a cup of water',
        target_count: null,
        saving_throw_ability: null,
        attack_roll: false,
        damage_roll: null,
        damage_types: ['cold'],
        duration: '1 hour',
        shape_type: null,
        shape_size: null,
        concentration: false,
        classes: ['srd-2024_warlock'],
    }),
];

export const EXTRA_FEATS: Fixture<O5Feat>[] = [
    {
        model: 'api_v2.feat',
        pk: 'extra_inspiring-leader',
        fields: {
            name: 'Inspiring Leader',
            desc: 'You can spend 10 minutes inspiring your companions, shoring up their resolve to fight.',
            type: 'General',
            prerequisite: 'Level 4+, Wisdom or Charisma 13+',
        },
    },
];

export const EXTRA_FEAT_BENEFITS: Fixture<O5FeatBenefit>[] = [
    {
        model: 'api_v2.featbenefit',
        pk: 'extra_inspiring-leader_asi',
        fields: {
            name: 'Ability Score Increase',
            desc: 'Increase your Wisdom or Charisma score by 1, to a maximum of 20.',
            parent: 'extra_inspiring-leader',
            type: 'ability_score_increase',
        },
    },
    {
        model: 'api_v2.featbenefit',
        pk: 'extra_inspiring-leader_performance',
        fields: {
            name: 'Bolstering Performance',
            desc: 'When you finish a Short or Long Rest, you can give a performance of up to 10 minutes. Choose up to six allies (which can include yourself) who witness it. Each gains Temporary Hit Points equal to your character level plus the modifier of the ability score you increased with this feat.',
            parent: 'extra_inspiring-leader',
            type: null,
        },
    },
];

export const withExtras = (data: Open5eData): Open5eData => ({
    ...data,
    spells: data.spells.length
        ? [...data.spells, ...EXTRA_SPELLS]
        : data.spells,
    feats: data.feats.length ? [...data.feats, ...EXTRA_FEATS] : data.feats,
    featBenefits: data.feats.length
        ? [...data.featBenefits, ...EXTRA_FEAT_BENEFITS]
        : data.featBenefits,
});
