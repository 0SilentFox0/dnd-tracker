import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const joinCampaignSchema = z.object({
  inviteCode: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const existingMember = campaign.members.find(m => m.userId === userId);
    if (existingMember) {
      return NextResponse.json(
        { error: "Already a member" },
        { status: 400 }
      );
    }

    // Перевіряємо чи юзер існує в базі
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

      user = await prisma.user.create({
        data: {
          id: userId,
          email: clerkUser.email_addresses[0]?.email_address || "",
          displayName: clerkUser.first_name && clerkUser.last_name
            ? `${clerkUser.first_name} ${clerkUser.last_name}`
            : clerkUser.username || "User",
          avatar: clerkUser.image_url,
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

    return NextResponse.json(member);
  } catch (error) {
    console.error("Error joining campaign:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
