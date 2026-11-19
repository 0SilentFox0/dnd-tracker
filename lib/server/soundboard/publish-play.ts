import 'server-only';
import { BattleStatus } from '@/lib/constants/battle';
import { SOUNDBOARD_PLAY_EVENT } from '@/lib/constants/soundboard';
import { prisma } from '@/lib/db';
import { battleChannelName, showChannelName } from '@/lib/pusher/channels';
import { safePusherTrigger } from '@/lib/pusher/safe-trigger';
import { pusherServer } from '@/lib/pusher/server';
import { logger } from '@/lib/utils/common/logger';
import type { SoundPlayEvent } from '@/types/soundboard';

export async function publishSoundPlay(
    campaignId: string,
    event: SoundPlayEvent
): Promise<void> {
    let battle: { id: string } | null = null;

    try {
        battle = await prisma.battleScene.findFirst({
            where: { campaignId, status: BattleStatus.ACTIVE },
            orderBy: { startedAt: 'desc' },
            select: { id: true },
        });
    } catch (error) {
        logger.error(
            '[soundboard] battle lookup failed',
            { campaignId },
            error
        );
    }

    const channels = [
        showChannelName(campaignId),
        ...(battle ? [battleChannelName(battle.id)] : []),
    ];

    await Promise.all(
        channels.map((channel) =>
            safePusherTrigger(
                pusherServer,
                channel,
                SOUNDBOARD_PLAY_EVENT,
                event,
                {
                    action: 'soundboard play',
                }
            )
        )
    );
}
