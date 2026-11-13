import {
    defineSpec,
    jsonField,
    nameField,
    textField,
} from '@/lib/utils/content/import/fields/common';

export const BACKGROUNDS_IMPORT = defineSpec({
    kind: 'backgrounds',
    fields: [
        nameField(),
        textField('icon'),
        textField('description'),
        {
            ...jsonField('choices'),
            nestedRef: { kind: 'spells', key: 'spellId' },
        },
        { key: 'originFeatId', type: 'ref', ref: 'feats', strictRef: true },
        jsonField('skillProficiencies'),
        jsonField('toolProficiencies'),
        textField('equipmentText'),
    ],
});
