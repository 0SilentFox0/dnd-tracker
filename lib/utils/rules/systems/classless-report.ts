import { CharacterClassesSchema } from '@/lib/schemas/classes';
import { safeParseRules } from '@/lib/utils/rules/schema';
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

export interface ReportClass {
    id: string;
    campaignId: string;
}

/** same test as the engine (from-character): classes enabled, valid `classes`, at least one entry resolves to a campaign class */
const hasEngineClass = (
    { classes }: ReportCharacter,
    classesEnabled: boolean,
    classIds: ReadonlySet<string> | undefined
) => {
    if (!classesEnabled || !classIds) return false;

    const parsed = CharacterClassesSchema.safeParse(classes);

    return parsed.success && parsed.data.some((e) => classIds.has(e.classId));
};

/** compositions that own `classes` but not `archetype` (d20 without hero scaling): classless characters there get HP 1 */
export const exposedCampaignIds = (
    campaigns: readonly ReportCampaign[]
): Set<string> =>
    new Set(
        campaigns
            .filter(({ rules }) => {
                const parsed = safeParseRules(rules);

                if (!parsed.ok) return false;

                const columns = statColumnsOf(ruleSystemOf(parsed.rules));

                return columns.has('classes') && !columns.has('archetype');
            })
            .map(({ id }) => id)
    );

export function classlessD20Characters(
    campaigns: readonly ReportCampaign[],
    characters: readonly ReportCharacter[],
    classes: readonly ReportClass[]
): ClasslessRow[] {
    const exposed = exposedCampaignIds(campaigns);

    const enabled = new Map(
        campaigns.map(({ id, rules }) => {
            const parsed = safeParseRules(rules);

            if (!parsed.ok) return [id, false] as const;

            const { classes: classRules } = parsed.rules;

            return [id, classRules.enabled] as const;
        })
    );

    const idsByCampaign = new Map<string, Set<string>>();

    for (const { id, campaignId } of classes) {
        const ids = idsByCampaign.get(campaignId) ?? new Set<string>();

        ids.add(id);
        idsByCampaign.set(campaignId, ids);
    }

    return characters
        .filter(
            (c) =>
                exposed.has(c.campaignId) &&
                !hasEngineClass(
                    c,
                    enabled.get(c.campaignId) ?? false,
                    idsByCampaign.get(c.campaignId)
                )
        )
        .map((c) => ({
            campaignId: c.campaignId,
            characterId: c.id,
            name: c.name,
            level: c.level,
        }));
}
