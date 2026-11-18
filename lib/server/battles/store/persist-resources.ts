import type { Prisma } from '@prisma/client';

import { ParticipantSourceType } from '@/lib/constants/battle';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { lockCharacters } from '@/lib/server/characters/lock';
import {
    type CharacterLogInput,
    writeCharacterLog,
} from '@/lib/server/characters/log';
import {
    battleResultLogData,
    battleResultOutcome,
} from '@/lib/utils/characters/resources/battle';
import { readResources } from '@/lib/utils/characters/resources/schema';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export function persistedHeroes(
    participants: BattleParticipant[]
): BattleParticipant[] {
    const seen = new Set<string>();

    return participants.filter((p) => {
        const { sourceType, sourceId, isExtraTurnSlot } = p.basicInfo;

        if (
            sourceType !== ParticipantSourceType.CHARACTER ||
            isExtraTurnSlot ||
            seen.has(sourceId)
        )
            return false;

        seen.add(sourceId);

        return true;
    });
}

export async function persistCharacterResources(
    tx: Pick<
        Prisma.TransactionClient,
        'character' | 'characterLog' | '$queryRaw'
    >,
    battle: { campaignId: string; battleId: string; rules: Ruleset },
    participants: BattleParticipant[]
): Promise<void> {
    const { persistResources } = battle.rules.outOfCombat;

    const hasParts =
        (ruleSystemOf(battle.rules).participant?.persist ?? []).length > 0;

    if (!persistResources && !hasParts) return;

    // the sheet is read only for heroes that have something to write back
    const heroes = persistedHeroes(participants).filter(
        (h) =>
            persistResources ||
            battleResultOutcome({}, h, battle.rules).clearInspiration
    );

    if (heroes.length === 0) return;

    const rows = await tx.character.findMany({
        where: {
            id: { in: heroes.map((h) => h.basicInfo.sourceId) },
            campaignId: battle.campaignId,
        },
        select: {
            id: true,
            resources: true,
            inspiration: true,
            characteristics: true,
        },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));

    const logs: CharacterLogInput[] = [];

    for (const hero of heroes) {
        const row = byId.get(hero.basicInfo.sourceId);

        if (!row) continue;

        const before = readResources(row.resources);

        const outcome = battleResultOutcome(before, hero, battle.rules);

        if (persistResources)
            await tx.character.update({
                where: { id: row.id },
                data: {
                    resources: outcome.resources as Prisma.InputJsonValue,
                },
            });

        const token = ruleSystemOf(battle.rules).combat.rerollToken;

        if (outcome.clearInspiration && token) {
            const locked = (await lockCharacters(tx, [row.id])).get(row.id);

            if (locked && token.stored(locked))
                await tx.character.update({
                    where: { id: row.id },
                    data: token.store(
                        locked,
                        false
                    ) as Prisma.CharacterUpdateInput,
                });
        }

        if (persistResources)
            logs.push({
                campaignId: battle.campaignId,
                characterId: row.id,
                actorUserId: null,
                kind: CharacterLogKind.BATTLE_RESULT,
                data: battleResultLogData(before, hero, battle.battleId),
            });
    }

    await writeCharacterLog(tx, logs);
}
