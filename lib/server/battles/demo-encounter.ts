import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { placeParticipants } from '@/lib/utils/battle/grid';
import { createBattleParticipantFromUnit } from '@/lib/utils/battle/participant/from-unit';
import type { BattleScene } from '@/types/api';
import type { BattleMapConfig, BattleParticipant } from '@/types/battle';

export async function buildDemoEncounter(
    scene: BattleScene
): Promise<BattleParticipant[]> {
    const units = await prisma.unit.findMany({
        where: {
            campaignId: scene.campaignId,
            id: { in: scene.participants.map((entry) => entry.id) },
        },
    });

    const unitsById = new Map(units.map((unit) => [unit.id, unit]));

    const built = await Promise.all(
        scene.participants.flatMap((entry) => {
            const unit = unitsById.get(entry.id);

            const count = Math.max(
                0,
                (entry.quantity ?? 1) - (entry.reserved ?? 0)
            );

            return unit
                ? Array.from({ length: count }, (_, index) =>
                      createBattleParticipantFromUnit(
                          unit,
                          scene.id,
                          entry.side,
                          index + 1
                      )
                  )
                : [];
        })
    );

    return placeParticipants(
        (scene.map ?? DEFAULT_BATTLE_MAP) as BattleMapConfig,
        built
    );
}
