import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { readArtifacts } from "./read-artifacts";

import { prisma } from "@/lib/db";
import { createArtifactSchema } from "@/lib/schemas/artifacts";
import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { invalidCampaignRefs } from "@/lib/utils/api/campaign-refs";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = await parseBody(createArtifactSchema, request);

    if (data instanceof NextResponse) return data;

    const foreignRef = await invalidCampaignRefs(id, { artifactSet: data.setId });

    if (foreignRef) return foreignRef;

    let icon = data.icon;

    if (icon !== undefined) {
      const resolved = await resolveArtifactIconForPersistence(icon, { campaignId: id, objectBaseName: randomUUID() });

      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 422 });
      }

      icon = resolved.value;
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return readArtifacts({ id });
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
