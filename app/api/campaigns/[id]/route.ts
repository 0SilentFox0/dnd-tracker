import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  maxLevel: z.number().min(1).max(30).optional(),
  xpMultiplier: z.number().min(1).max(10).optional(),
  allowPlayerEdit: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        dm: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Перевіряємо чи юзер є учасником кампанії
    const userMember = campaign.members.find(m => m.userId === userId);
    if (!userMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const userMember = campaign.members.find((m) => m.userId === userId);
    if (!userMember || userMember.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateCampaignSchema.parse(body);

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description:
          data.description === undefined ? undefined : data.description || null,
        maxLevel: data.maxLevel,
        xpMultiplier: data.xpMultiplier,
        allowPlayerEdit: data.allowPlayerEdit,
        status: data.status,
      },
      include: {
        members: {
          include: { user: true },
        },
        dm: true,
      },
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
