import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createArtifactSchema } from "@/app/api/campaigns/[id]/artifacts/schemas";
import { prisma } from "@/lib/db";
import {
  mirrorArtifactIconToSupabase,
  shouldMirrorArtifactIconUrl,
} from "@/lib/supabase/artifact-icon-storage";
import { abilitiesJson, artifactAbilities } from "@/lib/utils/abilities/read";
import { sheetStatBonuses } from "@/lib/utils/abilities/sheet-bonuses";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";

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

    const data = await parseBody(createArtifactSchema, request);

    if (data instanceof NextResponse) return data;

    let icon = data.icon;

    if (shouldMirrorArtifactIconUrl(icon)) {
      const sourceUrl = (typeof icon === "string" ? icon : "").trim();

      const mirrored = await mirrorArtifactIconToSupabase(sourceUrl, {
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
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        ...(data.weapon && weaponStatsColumns(data.weapon)),
        setId: data.setId,
        icon,
      },
      include: {
        artifactSet: true,
      },
    });

    return NextResponse.json(artifact);
  } catch (error) {
    return handleApiError(error, { action: "create artifact" });
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

    const rows = await prisma.artifact.findMany({
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

    const artifacts = rows.map(({ abilities, ...row }) => ({
      ...row,
      sheetBonuses: sheetStatBonuses(artifactAbilities({ ...row, abilities })),
      abilitySummary: abilitySummary("artifact", { ...row, abilities }),
    }));

    return NextResponse.json(artifacts);
  } catch (error) {
    return handleApiError(error, { action: "list artifacts" });
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
    return handleApiError(error, { action: "delete all artifacts" });
  }
}
