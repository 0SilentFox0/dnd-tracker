import { prisma } from "@/lib/db";
import { BATTLE_CHANNEL_PREFIX, USER_CHANNEL_PREFIX } from "@/lib/pusher-channels";

export async function isChannelAllowedForUser(channelName: string, userId: string): Promise<boolean> {
  if (channelName.startsWith(USER_CHANNEL_PREFIX)) {
    return channelName.slice(USER_CHANNEL_PREFIX.length) === userId;
  }

  if (channelName.startsWith(BATTLE_CHANNEL_PREFIX)) {
    const battleId = channelName.slice(BATTLE_CHANNEL_PREFIX.length);

    if (!battleId) return false;

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      select: { campaign: { select: { members: { where: { userId }, select: { userId: true } } } } },
    });

    return !!battle && battle.campaign.members.length > 0;
  }

  return false;
}
