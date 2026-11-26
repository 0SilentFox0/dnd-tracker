import cards from '@/components/landing/template-cards.json';
import { MANIFESTS } from '@/data/templates/manifests';

export type TemplateStats = {
    spells: number;
    units: number;
    classes: number;
    races: number;
};

export type TemplateCardId = keyof typeof cards;

type Counts = Partial<Record<keyof TemplateStats, number>>;

const manifests: Record<string, { counts: Counts }> = MANIFESTS;

// templates without classes (careers instead) report 0 and the chip is hidden
export function getTemplateStats(card: TemplateCardId): TemplateStats {
    const { counts } = manifests[cards[card]];

    return {
        spells: counts.spells ?? 0,
        units: counts.units ?? 0,
        classes: counts.classes ?? 0,
        races: counts.races ?? 0,
    };
}
