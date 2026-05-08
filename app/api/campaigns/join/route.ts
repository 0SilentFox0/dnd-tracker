import { NextResponse } from "next/server";
import { z } from "zod";

import { kvDel } from "@/lib/cache/kv";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

const joinCampaignSchema = z.object({
  inviteCode: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId, authUser } = authResult;

    const body = await request.json();

    const { inviteCode } = joinCampaignSchema.parse(body);

    // Знаходимо кампанію за кодом
    const campaign = await prisma.campaign.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Campaign is not active" },
        { status: 400 }
      );
    }

    // Перевіряємо чи юзер вже є учасником
    const existingMember = campaign.members.find((m) => m.userId === userId);

    if (existingMember) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Перевіряємо чи юзер існує в базі
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: authUser.email || "",
          displayName:
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0] ||
            "User",
          avatar:
            authUser.user_metadata?.avatar_url ||
            authUser.user_metadata?.picture ||
            null,
        },
      });
    }

    // Додаємо юзера до кампанії
    const member = await prisma.campaignMember.create({
      data: {
        campaignId: campaign.id,
        userId: userId,
        role: "player",
      },
      include: {
        campaign: true,
        user: true,
      },
    });

    await kvDel(`campaigns:${userId}`);

    return NextResponse.json(member);
  } catch (error) {
    return handleApiError(error, { action: "join campaign" });
  }
}
