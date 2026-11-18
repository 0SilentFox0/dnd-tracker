import type { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import {
    classLevelUp,
    LevelUpBodySchema,
    type LevelUpPick,
    readLevelUpPick,
} from './class-level-up';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { prisma } from '@/lib/db';
import { requireCharacterRecord } from '@/lib/server/characters/access';
import { assertNotInActiveBattle } from '@/lib/server/characters/battle-lock';
import { loadChoiceRefs } from '@/lib/server/characters/choices/load-refs';
import {
    characterClassMode,
    resolveCharacterChoices,
} from '@/lib/server/characters/choices/resolve-choices';
import { characteristicsPatch } from '@/lib/server/characters/core/characteristics-patch';
import { loadRaceProgression } from '@/lib/server/characters/core/load-race-progression';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import {
    defineCharacterOperation,
    dmCharacterGate,
    orThrow,
} from '@/lib/server/characters/operation-runner';
import { ContentError } from '@/lib/server/content/errors';
import { notifyCharacterOwners } from '@/lib/server/notifications/notify';
import { PUBLIC_USER_SELECT } from '@/lib/server/users/db-user';
import {
    choicesStateOf,
    withClassPicks,
} from '@/lib/utils/characters/choices/picks';
import { hasPicks } from '@/lib/utils/characters/choices/read';
import { applyLevelGain } from '@/lib/utils/characters/level-up/apply-level-gain';
import { seenLevelOnLevelChange } from '@/lib/utils/characters/seen-level';
import { levelNotificationEvents } from '@/lib/utils/notifications/events';
import {
    columnViewDto,
    withColumnView,
} from '@/lib/utils/rules/systems/column-view';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';

type Gate = Exclude<
    Awaited<ReturnType<typeof requireCharacterRecord>>,
    NextResponse
>;

type ClassResult = NonNullable<
    Exclude<Awaited<ReturnType<typeof classLevelUp>>, NextResponse>
>;

type Campaign = Gate['access']['campaign'];

type Tx = Prisma.TransactionClient;

interface ClassLevelUpArgs {
    gate: Gate;
    pick: LevelUpPick;
    refs: Awaited<ReturnType<typeof loadChoiceRefs>> | undefined;
}

function assertWithinMaxLevel(campaign: Campaign, level: number) {
    if (level > campaign.maxLevel)
        throw new ContentError(
            API_ERRORS.CHARACTER_MAX_LEVEL_REACHED,
            422,
            undefined,
            { max: campaign.maxLevel }
        );
}

async function applyClassLevelUp(
    tx: Tx,
    { gate: { access, character }, pick, refs }: ClassLevelUpArgs
) {
    const { campaign } = access;

    const id = character.campaignId;

    const characterId = character.id;

    await lockCharacters(tx, [characterId]);

    const stored = await tx.character.findUnique({
        where: { id: characterId },
    });

    if (!stored) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const row = withColumnView(stored, ruleSystemOf(campaign.rules));

    const fresh = await orThrow(
        classLevelUp({ campaign, character: row, pick })
    );

    if (!fresh) throw new ContentError(API_ERRORS.CLASS_REQUIRED, 422);

    const seenLevel = seenLevelOnLevelChange(
        row.level,
        fresh.level,
        row.seenLevel
    );

    const before = choicesStateOf(row);

    const raised = fresh.classes.find((e) => e.classId === pick.classId);

    const choices = refs
        ? await resolveCharacterChoices({
              campaignId: id,
              rules: campaign.rules,
              isDM: true,
              character: { ...row, level: fresh.level },
              before,
              after: {
                  ...before,
                  classes: withClassPicks(fresh.classes, {
                      [pick.classId as string]: {
                          ...(raised?.choices ?? {}),
                          ...pick.choices,
                      },
                  }),
              },
              refs,
          })
        : null;

    if (choices && !choices.ok) throw choices.error;

    const updated = await tx.character.update({
        where: { id: characterId },
        data: {
            classes: fresh.classes as unknown as Prisma.InputJsonValue,
            level: fresh.level,
            class: fresh.class,
            subclass: fresh.subclass,
            spellSlots: fresh.spellSlots as Prisma.InputJsonValue,
            ...(fresh.spellcastingAbility && {
                spellcastingAbility: fresh.spellcastingAbility,
            }),
            ...(seenLevel !== undefined && { seenLevel }),
            ...(choices?.ok && choices.fields),
            ...(choices?.ok &&
                characteristicsPatch(
                    choices.fields,
                    ruleSystemOf(campaign.rules),
                    row.characteristics
                )),
        },
        include: {
            user: { select: PUBLIC_USER_SELECT },
            inventory: true,
        },
    });

    await notifyCharacterOwners(
        {
            campaignId: id,
            actorUserId: access.userId,
            events: levelNotificationEvents(
                characterId,
                row.level,
                fresh.level
            ),
        },
        tx
    );

    if (choices?.ok)
        await writeCharacterLog(tx, [
            {
                campaignId: id,
                characterId,
                actorUserId: access.userId,
                kind: CharacterLogKind.CHOICES_EDIT,
                data: { before, after: choices.state },
            },
        ]);

    return {
        ...columnViewDto(updated, ruleSystemOf(campaign.rules)),
        levelUpDetails: {
            abilityIncreased: null,
            classId: pick.classId,
        },
    };
}

async function levelUpWithClass(
    gate: Gate,
    pick: LevelUpPick,
    classResult: ClassResult
) {
    const { campaign } = gate.access;

    const withChoices = hasPicks(pick.choices);

    if (withChoices)
        await assertNotInActiveBattle(gate.character.campaignId, [
            gate.character.id,
        ]);

    const refs = withChoices
        ? await loadChoiceRefs(gate.character.campaignId, gate.character.race, {
              classMode: characterClassMode(
                  campaign.rules,
                  classResult.classes
              ),
              backgroundIds: [choicesStateOf(gate.character).backgroundId],
          })
        : undefined;

    return prisma.$transaction((tx) =>
        applyClassLevelUp(tx, { gate, pick, refs })
    );
}

async function applyFlatLevelUp(
    tx: Tx,
    { access, character }: Gate,
    race: Awaited<ReturnType<typeof loadRaceProgression>>
) {
    const { campaign } = access;

    await lockCharacters(tx, [character.id]);

    const stored = await tx.character.findUnique({
        where: { id: character.id },
    });

    if (!stored) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const fresh = withColumnView(stored, ruleSystemOf(campaign.rules));

    const freshLevel = fresh.level + 1;

    assertWithinMaxLevel(campaign, freshLevel);

    const gain = applyLevelGain({
        character: fresh,
        race,
        campaign,
        fromLevel: fresh.level,
        toLevel: freshLevel,
    });

    const seenLevel = seenLevelOnLevelChange(
        fresh.level,
        freshLevel,
        fresh.seenLevel
    );

    const updated = await tx.character.update({
        where: { id: character.id },
        data: {
            level: freshLevel,
            ...(seenLevel !== undefined && { seenLevel }),
            ...gain.abilityScores,
            ...characteristicsPatch(
                gain.abilityScores,
                ruleSystemOf(campaign.rules),
                fresh.characteristics
            ),
            spellSlots: gain.spellSlots as Prisma.InputJsonValue,
        },
        include: {
            user: { select: PUBLIC_USER_SELECT },
            inventory: true,
        },
    });

    return {
        updatedCharacter: updated,
        gain,
        fromLevel: fresh.level,
        newLevel: freshLevel,
    };
}

async function levelUpFlat(gate: Gate) {
    const { access, character } = gate;

    const { campaign } = access;

    assertWithinMaxLevel(campaign, character.level + 1);

    const race = await loadRaceProgression(
        character.campaignId,
        character.race
    );

    const { updatedCharacter, gain, fromLevel, newLevel } =
        await prisma.$transaction((tx) => applyFlatLevelUp(tx, gate, race));

    await notifyCharacterOwners(
        {
            campaignId: character.campaignId,
            actorUserId: access.userId,
            events: levelNotificationEvents(character.id, fromLevel, newLevel),
        },
        prisma
    );

    return {
        ...columnViewDto(updatedCharacter, ruleSystemOf(campaign.rules)),
        levelUpDetails: {
            abilityIncreased: gain.gained[0] ?? null,
            spellSlots: gain.spellSlots,
        },
    };
}

async function levelUpCore(gate: Gate, pick: LevelUpPick) {
    const { campaign } = gate.access;

    if (!ruleSystemOf(campaign.rules).progression.levels)
        throw new ContentError(API_ERRORS.SYSTEM_LEVELS_UNSUPPORTED, 409);

    const classResult = await orThrow(
        classLevelUp({ campaign, character: gate.character, pick })
    );

    return classResult
        ? levelUpWithClass(gate, pick, classResult)
        : levelUpFlat(gate);
}

export const levelUpOperation = defineCharacterOperation({
    name: 'level-up',
    action: 'level up character',
    schema: LevelUpBodySchema,
    gate: dmCharacterGate((ctx, access) =>
        requireCharacterRecord(ctx.campaignId, ctx.characterId, {
            access,
            notFound: API_ERRORS.NOT_FOUND,
        })
    ),
    body: readLevelUpPick,
    run: levelUpCore,
});
