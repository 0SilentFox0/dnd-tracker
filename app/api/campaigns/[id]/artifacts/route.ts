import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { ZodError } from "zod";

import { createArtifactSchema } from "@/app/api/campaigns/[id]/artifacts/schemas";
import { prisma } from "@/lib/db";
import {
  mirrorArtifactIconToSupabase,
  shouldMirrorArtifactIconUrl,
} from "@/lib/supabase/artifact-icon-storage";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();

    const data = createArtifactSchema.parse(body);

    let icon = data.icon;

    if (shouldMirrorArtifactIconUrl(icon)) {
      const mirrored = await mirrorArtifactIconToSupabase(icon, {
        campaignId: id,
        objectBaseName: randomUUID(),
      });

      if (!mirrored.ok) {
        return NextResponse.json({ error: mirrored.message }, { status: 422 });
      }

      icon = mirrored.publicUrl;
    }

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
        icon,
      },
      include: {
        artifactSet: true,
      },
    });

    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Error creating artifact:", error);

    if (error instanceof ZodError) {
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
    
    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const result = await prisma.artifact.deleteMany({
      where: { campaignId: id },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting all artifacts:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
