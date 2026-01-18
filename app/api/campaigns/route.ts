import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/api-auth";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  maxLevel: z.number().min(1).max(30).default(20),
  xpMultiplier: z.number().min(1).max(10).default(2.5),
  allowPlayerEdit: z.boolean().default(true),
});

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

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Перевіряємо авторизацію
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

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

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
