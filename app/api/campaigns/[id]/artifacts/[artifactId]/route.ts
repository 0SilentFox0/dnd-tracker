import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

const updateArtifactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  rarity: z
    .enum(ARTIFACT_RARITY_VALUES)
    .nullable()
    .optional(),
  slot: z.enum(ARTIFACT_SLOT_VALUES).optional(),
  bonuses: z.record(z.string(), z.number()).optional(),
  modifiers: z
    .array(
      z.object({
        type: z.string(),
        value: z.number(),
        isPercentage: z.boolean(),
        element: z.string().optional(),
      })
    )
    .optional(),
  passiveAbility: z
    .object({
      name: z.string(),
      description: z.string(),
      effect: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable()
    .optional(),
  setId: z.string().nullable().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional()
  ),
});

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
    console.error("Error fetching artifact:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const data = updateArtifactSchema.parse(body);

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
            ? data.passiveAbility
              ? (data.passiveAbility as Prisma.InputJsonValue)
              : Prisma.JsonNull
            : undefined,
        setId: data.setId !== undefined ? (data.setId || null) : undefined,
        icon: data.icon !== undefined ? data.icon : undefined,
      },
      include: { artifactSet: true },
    });

    return NextResponse.json(updatedArtifact);
  } catch (error) {
    console.error("Error updating artifact:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    console.error("Error deleting artifact:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
