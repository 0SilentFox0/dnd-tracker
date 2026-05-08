import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  BATTLE_CHANNEL_PREFIX,
  pusherServer,
  USER_CHANNEL_PREFIX,
} from "@/lib/pusher";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    const body = await request.json();

    const { socket_id, channel_name } = body as {
      socket_id?: string;
      channel_name?: string;
    };

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
