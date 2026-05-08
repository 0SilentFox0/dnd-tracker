import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { patchArtifactSchema } from "@/app/api/campaigns/[id]/artifacts/schemas";
import { prisma } from "@/lib/db";
import {
  mirrorArtifactIconToSupabase,
  shouldMirrorArtifactIconUrl,
} from "@/lib/supabase/artifact-icon-storage";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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

    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
      include: { artifactSet: true },
    });

    const validationError = validateCampaignOwnership(artifact, id);

    if (validationError) {
      return validationError;
    }

    return NextResponse.json(artifact);
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

    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    const validationError = validateCampaignOwnership(artifact, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = patchArtifactSchema.parse(body);

    let resolvedIcon = data.icon;

    if (
      data.icon !== undefined &&
      shouldMirrorArtifactIconUrl(data.icon)
    ) {
      const sourceUrl = (typeof data.icon === "string" ? data.icon : "").trim();

      const mirrored = await mirrorArtifactIconToSupabase(sourceUrl, {
        campaignId: id,
        objectBaseName: `${artifactId}-${randomUUID()}`,
      });

      if (!mirrored.ok) {
        return NextResponse.json({ error: mirrored.message }, { status: 422 });
      }

      resolvedIcon = mirrored.publicUrl;
    }

    const updatedArtifact = await prisma.artifact.update({
      where: { id: artifactId },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        rarity: data.rarity !== undefined ? data.rarity : undefined,
        slot: data.slot,
        bonuses: data.bonuses !== undefined ? (data.bonuses as Prisma.InputJsonValue) : undefined,
        modifiers: data.modifiers !== undefined ? (data.modifiers as Prisma.InputJsonValue) : undefined,
        passiveAbility:
          data.passiveAbility !== undefined
            ? data.passiveAbility === null
              ? Prisma.JsonNull
              : (data.passiveAbility as Prisma.InputJsonValue)
            : undefined,
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

    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    const validationError = validateCampaignOwnership(artifact, id);

    if (validationError) {
      return validationError;
    }

    await prisma.artifact.delete({
      where: { id: artifactId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete artifact" });
  }
}
