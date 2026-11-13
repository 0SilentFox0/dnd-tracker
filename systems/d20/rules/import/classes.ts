import { CLASS_CASTERS } from '@/lib/constants/classes';
import {
    ABILITY_ENUM,
    defineSpec,
    jsonField,
    nameField,
    textField,
} from '@/lib/utils/content/import/fields/common';
export const CLASSES_IMPORT = defineSpec({
    kind: 'classes',
    fields: [
        nameField(),
        textField('icon'),
        textField('color'),
        { key: 'hitDie', type: 'int' },
        { key: 'savingThrows', type: 'list', ...ABILITY_ENUM },
        jsonField('proficiencies'),
        jsonField('skillChoices'),
        { key: 'caster', type: 'enum', enumValues: CLASS_CASTERS },
        { key: 'spellcastingAbility', type: 'enum', ...ABILITY_ENUM },
        jsonField('features'),
        { key: 'subclassLevel', type: 'int' },
        jsonField('subclasses'),
        jsonField('columns'),
        textField('spellList'),
    ],
});
