import { NextResponse } from "next/server";

import { toArtifactSetErrorResponse } from "./route-errors";
import { createArtifactSetSchema } from "./schemas";

import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import {
  insertArtifactSet,
  listArtifactSets,
  reloadArtifactSetWithArtifacts,
} from "@/lib/utils/artifacts/artifact-set-queries";
import { syncArtifactSetMembers } from "@/lib/utils/artifacts/sync-artifact-set-members";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const sets = await listArtifactSets(id);

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Error fetching artifact sets:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = createArtifactSetSchema.parse(await request.json());

    const created = await insertArtifactSet(id, {
      name: data.name,
      description: data.description ?? null,
      setBonus: data.setBonus,
    });

    if (data.artifactIds?.length) {
      await syncArtifactSetMembers(id, created.id, data.artifactIds);
    }

    const full = await reloadArtifactSetWithArtifacts(created.id);

    return NextResponse.json(full);
  } catch (error) {
    console.error("Error creating artifact set:", error);

    const known = toArtifactSetErrorResponse(error);

    if (known) return known;

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
