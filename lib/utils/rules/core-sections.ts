import { sectionItems } from './section-items';
import type { SectionsContribution } from './sections';

export const CORE_SECTIONS: SectionsContribution = {
    sections: {
        system: {
            owner: 'core',
            mechanic: false,
            items: sectionItems('system', ['key']),
        },
        defaultAttacks: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('defaultAttacks', [
                'meleeName',
                'rangedName',
                'weaponName',
            ]),
        },
        spellIngredients: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('spellIngredients', ['enabled', 'autoPay']),
        },
        outOfCombat: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('outOfCombat', ['persistResources', 'xp']),
        },
        encounters: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('encounters', ['balance', 'unitGroups']),
        },
        items: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('items', ['enabled']),
        },
    },
};
