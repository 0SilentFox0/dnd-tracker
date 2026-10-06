import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BATTLE_CHANNEL_PREFIX, USER_CHANNEL_PREFIX } from "@/lib/pusher-channels";
import { pusherServer } from "@/lib/pusher-server";

/**
 * Pusher channel auth.
 *
 * Дозволяє підписку лише якщо:
 *  - `private-battle-{battleId}` → user є членом кампанії, до якої належить battle.
 *  - `private-user-{userId}` → user_id з сесії дорівнює userId з channel_name.
 *
 * Без цієї перевірки будь-який авторизований user міг би слухати real-time
 * події битв з чужих кампаній (CODE_AUDIT 4.1).
 */
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { socket_id, channel_name } = await readAuthParams(request);

    if (typeof socket_id !== "string" || typeof channel_name !== "string") {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 },
      );
    }

    const allowed = await isChannelAllowedForUser(channel_name, userId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: userId,
      user_info: {
        name: userId,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Error authenticating Pusher:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// pusher-js (ajax transport) шле форму, а не JSON
async function readAuthParams(request: Request): Promise<{ socket_id?: unknown; channel_name?: unknown }> {
  if (request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(await request.text());

    return { socket_id: form.get("socket_id") ?? undefined, channel_name: form.get("channel_name") ?? undefined };
  }

  return (await request.json()) as { socket_id?: unknown; channel_name?: unknown };
}

async function isChannelAllowedForUser(
  channelName: string,
  userId: string,
): Promise<boolean> {
  if (channelName.startsWith(USER_CHANNEL_PREFIX)) {
    const targetUserId = channelName.slice(USER_CHANNEL_PREFIX.length);

    return targetUserId === userId;
  }

  if (channelName.startsWith(BATTLE_CHANNEL_PREFIX)) {
    const battleId = channelName.slice(BATTLE_CHANNEL_PREFIX.length);

    if (!battleId) return false;

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      select: {
        campaignId: true,
        campaign: {
          select: {
            members: {
              where: { userId },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!battle) return false;

    return battle.campaign.members.length > 0;
  }

  // Невідомий префікс — забороняємо.
  return false;
}
