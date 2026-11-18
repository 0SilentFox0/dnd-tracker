import { prisma } from '@/lib/db';
import { publicSetup } from '@/lib/utils/battle/participant/reserve';
import { battleSceneListSelect } from '@/lib/utils/battle/store/scene-list-select';
import type { BattlePreparationParticipant } from '@/types/battle';

export function listBattleBriefs(campaignId: string) {
    return prisma.battleScene.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true },
    });
}

export async function listCampaignBattles(campaignId: string, isDM: boolean) {
    const battles = await prisma.battleScene.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        select: battleSceneListSelect,
    });

    return battles.map((b) => ({
        ...b,
        participants: isDM
            ? b.participants
            : publicSetup(
                  b.participants as unknown as BattlePreparationParticipant[]
              ),
        initiativeOrder: [] as unknown[],
        battleLog: [] as unknown[],
    }));
}
