import type { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { prisma } from '@/lib/db';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import type { SheetRollInput } from '@/lib/schemas/out-of-combat';
import type { CharacterGate } from '@/lib/server/characters/access';
import { loadBattleEffects } from '@/lib/server/characters/battle-effects';
import { assertNotInActiveBattle } from '@/lib/server/characters/battle-lock';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { buildCharacterParticipant } from '@/lib/server/characters/participant';
import { ContentError } from '@/lib/server/content/errors';
import { rerollTokenOn } from '@/lib/utils/rules/reroll-token-on';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import {
    readStoredColumn,
    STORED_COLUMN,
    storedColumnUpdate,
} from '@/lib/utils/rules/systems/stored-columns';
import type { SheetRollResult } from '@/types/characters';

function logData(result: SheetRollResult, inspired: boolean) {
    if (result.kind === 'percentile') {
        const {
            label,
            rawRoll,
            roll,
            reversed,
            target,
            sl,
            outcome,
            auto,
            difficulty,
            mode,
        } = result;

        return {
            label,
            rawRoll,
            roll,
            reversed,
            target,
            sl,
            outcome,
            auto,
            difficulty,
            mode,
        };
    }

    return {
        label: result.label,
        rolls: result.rolls,
        total: result.total,
        mode: result.mode,
        ...(result.autoFail && { autoFail: true }),
        ...(inspired && { inspiration: true }),
    };
}

export async function rollForSheet(
    { access, character }: CharacterGate,
    body: SheetRollInput
) {
    const { rules, maxLevel } = access.campaign;

    const system = ruleSystemOf(rules);

    if (!system.sheetTest.accepts(body))
        throw new ContentError(API_ERRORS.ROLL_KIND_MISMATCH, 400);

    const inspired = body.kind !== 'test' && !!body.useInspiration;

    if (inspired) {
        if (!rerollTokenOn(rules))
            throw new ContentError(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

        await assertNotInActiveBattle(character.campaignId, [character.id]);
    }

    const built = await buildCharacterParticipant(character, {
        maxLevel,
        rules,
    });

    let { participant } = built;

    if (system.conditions) {
        const effects = await loadBattleEffects(
            character.campaignId,
            character.id
        );

        if (effects)
            participant = {
                ...participant,
                battleData: {
                    ...participant.battleData,
                    activeEffects: effects,
                },
            };
    }

    const result = system.sheetTest.roll({
        participant,
        character,
        body,
        rules,
        rng: Math.random,
        inspiration: inspired,
        t: await getTranslator(await getRequestLocale()),
    });

    const logged = await prisma.$transaction(async (tx) => {
        if (inspired) {
            const token = system.combat.rerollToken;

            const row = (await lockCharacters(tx, [character.id])).get(
                character.id
            );

            if (
                !row ||
                !token ||
                !readStoredColumn(
                    rules,
                    row,
                    STORED_COLUMN.inspiration,
                    'boolean'
                )
            )
                return false;

            await tx.character.update({
                where: { id: character.id },
                data: storedColumnUpdate(
                    row,
                    STORED_COLUMN.inspiration,
                    false
                ) as Prisma.CharacterUpdateInput,
            });
        }

        await writeCharacterLog(tx, [
            {
                campaignId: character.campaignId,
                characterId: character.id,
                actorUserId: access.userId,
                kind:
                    body.kind === 'save'
                        ? CharacterLogKind.SAVE
                        : body.kind === 'test'
                          ? CharacterLogKind.TEST
                          : CharacterLogKind.CHECK,
                data: logData(result, inspired),
            },
        ]);

        return true;
    });

    if (!logged) throw new ContentError(API_ERRORS.NO_INSPIRATION, 409);

    return result;
}
