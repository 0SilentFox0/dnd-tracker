import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { CharacterClassesSchema } from '@/lib/schemas/classes';
import { loadBackground } from '@/lib/server/backgrounds/load';
import { systemServerOf } from '@/lib/server/systems/lookup';
import { readChoiceList } from '@/lib/utils/abilities/read';
import { loadClassesById } from '@/lib/utils/battle/participant/load-classes';
import { loadFeatsById } from '@/lib/utils/battle/participant/load-feats';
import type {
    CampaignSpellContext,
    CharacterFromPrisma,
} from '@/lib/utils/battle/types/participant';
import { choicesStateOf } from '@/lib/utils/characters/choices/picks';
import { selectionNeedsFeats } from '@/lib/utils/characters/choices/selections';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { inventoryArtifactIds } from '@/lib/utils/items/resolve';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { resolveClassEntries } from '@/lib/utils/spells/class-slots';
import type { ResolvedClassEntry } from '@/types/classes';

export interface CharacterContext {
    context: CampaignSpellContext;
    race: Prisma.RaceGetPayload<object> | null;
    tree: Prisma.SkillTreeGetPayload<object> | null;
    classEntries: ResolvedClassEntry[];
}

function indexArtifacts(
    artifacts: Record<string, unknown>[],
    joined: string[]
): NonNullable<CampaignSpellContext['artifactsById']> {
    const artifactsById: NonNullable<CampaignSpellContext['artifactsById']> =
        {};

    for (const raw of artifacts) {
        const row = { ...raw };

        for (const key of joined) delete row[key];

        artifactsById[row.id as string] =
            row as unknown as Prisma.ArtifactGetPayload<object>;
    }

    return artifactsById;
}

export async function loadCharacterContext(
    character: CharacterFromPrisma,
    settings: { maxLevel: number; rules: Ruleset }
): Promise<CharacterContext> {
    const { campaignId, race: raceName } = character;

    const { maxLevel, rules } = settings;

    const artifactIds = inventoryArtifactIds(character.inventory, {
        stash: rules.items.enabled,
        consumables: rules.items.enabled,
    });

    const loaders = systemServerOf(rules).participant?.characterContext ?? [];

    const artifactInclude = Object.assign(
        {},
        ...loaders.map((l) => l.artifactInclude)
    ) as Prisma.ArtifactInclude;

    const joined = Object.keys(artifactInclude);

    const [campaign, artifacts] = await Promise.all([
        prisma.campaign.findUnique({
            where: { id: campaignId },
            select: {
                races: { where: { name: raceName }, take: 1 },
                ...Object.assign(
                    {},
                    ...loaders.map((l) => l.select?.(character))
                ),
            },
        }),
        artifactIds.length > 0
            ? prisma.artifact.findMany({
                  where: { id: { in: artifactIds }, campaignId },
                  ...(joined.length > 0 && { include: artifactInclude }),
              })
            : [],
    ]);

    const race = campaign?.races[0] ?? null;

    const contributions = await Promise.all(
        loaders.map((l) =>
            l.load({
                character,
                campaignId,
                campaign,
                artifacts: artifacts as Record<string, unknown>[],
            })
        )
    );

    const skills = contributions.flatMap((c) => c.skills ?? []);

    const personalId = character.personalSkillId?.trim();

    // A campaign without the skill-trees module still shows a stored personal skill on the sheet
    if (personalId && !skills.some((s) => s.id === personalId)) {
        const personal = await prisma.skill.findFirst({
            where: { id: personalId, campaignId },
        });

        if (personal) skills.push(personal);
    }

    const tree = contributions.find((c) => c.tree !== undefined)?.tree ?? null;

    const withClasses = classesEnabled(rules);

    const classesById = withClasses
        ? await loadClassesById(campaignId)
        : undefined;

    const parsedClasses = withClasses
        ? CharacterClassesSchema.safeParse(character.classes)
        : null;

    const classEntries =
        parsedClasses?.success && parsedClasses.data.length > 0
            ? resolveClassEntries(parsedClasses.data, classesById ?? {})
            : [];

    const classMode = classEntries.some((e) => e.class);

    const state = choicesStateOf(character);

    const needsSelections =
        classMode || (race ? readChoiceList(race.choices).length > 0 : false);

    const hasTalents =
        Object.keys(ruleSystemOf(rules).advancement?.talentsOf(character) ?? {})
            .length > 0;

    const featsById = await loadFeatsById(
        campaignId,
        (needsSelections && selectionNeedsFeats(state, classMode)) || hasTalents
    );

    const background = classMode
        ? await loadBackground(campaignId, state.backgroundId)
        : null;

    const artifactsById = indexArtifacts(
        artifacts as Record<string, unknown>[],
        joined
    );

    return {
        race,
        tree,
        classEntries,
        context: {
            ext: Object.assign({}, ...contributions.map((c) => c.ext)),
            spells: contributions.flatMap((c) => c.spells ?? []),
            allSkills: skills,
            racesByName: { [raceName]: race },
            campaign: { maxLevel },
            rules,
            skillsById: Object.fromEntries(skills.map((s) => [s.id, s])),
            artifactsById,
            featsById,
            backgroundsById: background ? { [background.id]: background } : {},
            ...(classesById && { classesById }),
        },
    };
}
