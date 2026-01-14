import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Prisma } from "@prisma/client";

const createArtifactSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  rarity: z
    .enum(["common", "uncommon", "rare", "epic", "legendary"])
    .optional(),
  slot: z.enum([
    "weapon",
    "shield",
    "cloak",
    "ring",
    "helmet",
    "amulet",
    "item",
  ]),
  bonuses: z.record(z.string(), z.number()).default({}),
  modifiers: z
    .array(
      z.object({
        type: z.string(),
        value: z.number(),
        isPercentage: z.boolean(),
        element: z.string().optional(),
      })
    )
    .default([]),
  passiveAbility: z
    .object({
      name: z.string(),
      description: z.string(),
      effect: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  setId: z.string().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional()
  ),
});

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
    const data = createArtifactSchema.parse(body);

    const artifact = await prisma.artifact.create({
      data: {
        campaignId: id,
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        bonuses: data.bonuses as Prisma.InputJsonValue,
        modifiers: data.modifiers as Prisma.InputJsonValue,
        passiveAbility: data.passiveAbility
          ? (data.passiveAbility as Prisma.InputJsonValue)
          : undefined,
        setId: data.setId,
        icon: data.icon,
      },
      include: {
        artifactSet: true,
      },
    });

    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Error creating artifact:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const artifacts = await prisma.artifact.findMany({
      where: {
        campaignId: id,
      },
      include: {
        artifactSet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(artifacts);
  } catch (error) {
    console.error("Error fetching artifacts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
