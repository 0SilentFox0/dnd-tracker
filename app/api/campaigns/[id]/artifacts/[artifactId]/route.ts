import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import { patchArtifactSchema } from "@/lib/schemas/artifacts";
import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
import { abilitiesJson, readAbilities } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { invalidCampaignRefs } from "@/lib/utils/api/campaign-refs";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id, artifactId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const artifact = await loadOwned(
      prisma.artifact.findUnique({
        where: { id: artifactId },
        include: { artifactSet: true },
      }),
      id,
    );

    if (artifact instanceof NextResponse) return artifact;

    const { abilities, issues: abilityIssues } = readAbilities("artifact", artifact);

    return NextResponse.json({ ...artifact, abilities, abilityIssues });
  } catch (error) {
    return handleApiError(error, { action: "fetch artifact" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id, artifactId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const artifact = await loadOwned(
      prisma.artifact.findUnique({
        where: { id: artifactId },
      }),
      id,
    );

    if (artifact instanceof NextResponse) return artifact;

    const data = await parseBody(patchArtifactSchema, request);

    if (data instanceof NextResponse) return data;

    const foreignRef = await invalidCampaignRefs(id, { artifactSet: data.setId });

    if (foreignRef) return foreignRef;

    let resolvedIcon = data.icon;

    if (data.icon !== undefined && data.icon !== artifact.icon) {
      const resolved = await resolveArtifactIconForPersistence(data.icon, {
        campaignId: id,
        objectBaseName: `${artifactId}-${randomUUID()}`,
      });

      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 422 });
      }

      resolvedIcon = resolved.value;
    }

    const updatedArtifact = await prisma.artifact.update({
      where: { id: artifactId },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        rarity: data.rarity !== undefined ? data.rarity : undefined,
        slot: data.slot,
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        ...(data.weapon && weaponStatsColumns(data.weapon)),
        setId: data.setId !== undefined ? (data.setId || null) : undefined,
        icon:
          data.icon !== undefined ? resolvedIcon ?? null : undefined,
      },
      include: { artifactSet: true },
    });

    return NextResponse.json(updatedArtifact);
  } catch (error) {
    return handleApiError(error, { action: "update artifact" });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const { id, artifactId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const artifact = await loadOwned(
      prisma.artifact.findUnique({
        where: { id: artifactId },
        select: { campaignId: true },
      }),
      id,
    );

    if (artifact instanceof NextResponse) return artifact;

    await prisma.artifact.deleteMany({
      where: { id: artifactId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete artifact" });
  }
}
