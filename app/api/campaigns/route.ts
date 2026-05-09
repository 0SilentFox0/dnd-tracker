import { NextResponse } from "next/server";

import { kvDel, kvGet, kvSet } from "@/lib/cache/kv";
import { prisma } from "@/lib/db";
import { createCampaignSchema } from "@/lib/schemas";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

// Генерує унікальний код запрошення
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  try {
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId, authUser } = authResult;

    const body = await request.json();

    const data = createCampaignSchema.parse(body);

    // Перевіряємо чи юзер існує в базі, якщо ні - створюємо
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: authUser.email || "",
          displayName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || "User",
          avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        },
      });
    }

    // Створюємо кампанію
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        inviteCode: generateInviteCode(),
        dmUserId: userId,
        maxLevel: data.maxLevel,
        xpMultiplier: data.xpMultiplier,
        allowPlayerEdit: data.allowPlayerEdit,
        members: {
          create: {
            userId: userId,
            role: "dm",
          },
        },
      },
      include: {
        members: true,
      },
    });

    await kvDel(`campaigns:${userId}`);

    return NextResponse.json(campaign);
  } catch (error) {
    return handleApiError(error, { action: "create campaign" });
  }
}

export async function GET() {
  try {
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const cacheKey = `campaigns:${userId}`;

    const cached = await kvGet<unknown[]>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        },
      });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    await kvSet(cacheKey, campaigns);

    return NextResponse.json(campaigns, {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return handleApiError(error, { action: "list campaigns" });
  }
}
