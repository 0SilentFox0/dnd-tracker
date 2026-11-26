import grimRaces from '@/data/templates/grim-d100/races.json';
import grimSpells from '@/data/templates/grim-d100/spells.json';
import grimUnits from '@/data/templates/grim-d100/units.json';
import srdClasses from '@/data/templates/srd-5.2/classes.json';
import srdRaces from '@/data/templates/srd-5.2/races.json';
import srdSpells from '@/data/templates/srd-5.2/spells.json';
import srdUnits from '@/data/templates/srd-5.2/units.json';

export type TemplateStats = {
    spells: number;
    units: number;
    classes: number;
    races: number;
};

const STATS = {
    'srd-5.2': {
        spells: srdSpells.length,
        units: srdUnits.length,
        classes: srdClasses.length,
        races: srdRaces.length,
    },
    // grim has careers instead of classes
    'grim-d100': {
        spells: grimSpells.length,
        units: grimUnits.length,
        classes: 0,
        races: grimRaces.length,
    },
} satisfies Record<string, TemplateStats>;

export function getTemplateStats(key: keyof typeof STATS): TemplateStats {
    return STATS[key];
}
