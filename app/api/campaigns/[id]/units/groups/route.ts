import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  damageModifier: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
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
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groups = await prisma.unitGroup.findMany({
      where: {
        campaignId: id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching unit groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createGroupSchema.parse(body);

    const existing = await prisma.unitGroup.findFirst({
      where: { campaignId: id, name: data.name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Group already exists" },
        { status: 400 }
      );
    }

    const groupCount = await prisma.unitGroup.count({
      where: { campaignId: id },
    });
    const colors = [
      "#ef4444", // red
      "#f97316", // orange
      "#eab308", // yellow
      "#22c55e", // green
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#ec4899", // pink
    ];
    const color = colors[groupCount % colors.length];

    const group = await prisma.unitGroup.create({
      data: {
        campaignId: id,
        name: data.name.trim(),
        color,
        damageModifier: data.damageModifier ?? null,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error creating unit group:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
