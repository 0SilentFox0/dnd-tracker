import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

export interface ReportCampaign {
    id: string;
    rules: unknown;
}

export interface ReportCharacter {
    id: string;
    campaignId: string;
    name: string;
    level: number;
    class: string;
    classes: unknown;
}

export interface ClasslessRow {
    campaignId: string;
    characterId: string;
    name: string;
    level: number;
}

const hasClass = ({ class: name, classes }: ReportCharacter) =>
    name.trim() !== '' || (Array.isArray(classes) && classes.length > 0);

/** compositions that own `classes` but not `archetype` (d20 without hero scaling): classless characters there get HP 1 */
export const exposedCampaignIds = (
    campaigns: readonly ReportCampaign[]
): Set<string> =>
    new Set(
        campaigns
            .filter(({ rules }) => {
                const columns = statColumnsOf(ruleSystemOf(parseRules(rules)));

                return columns.has('classes') && !columns.has('archetype');
            })
            .map(({ id }) => id)
    );

export function classlessD20Characters(
    campaigns: readonly ReportCampaign[],
    characters: readonly ReportCharacter[]
): ClasslessRow[] {
    const exposed = exposedCampaignIds(campaigns);

    return characters
        .filter((c) => exposed.has(c.campaignId) && !hasClass(c))
        .map((c) => ({
            campaignId: c.campaignId,
            characterId: c.id,
            name: c.name,
            level: c.level,
        }));
}
