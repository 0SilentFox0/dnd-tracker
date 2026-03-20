import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { toArtifactSetErrorResponse } from "../route-errors";
import { patchArtifactSetSchema } from "../schemas";

import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import {
  buildArtifactSetPatchInput,
  deleteArtifactSetAndClearArtifacts,
  findArtifactSetInCampaign,
  reloadArtifactSetDetail,
  updateArtifactSetRow,
} from "@/lib/utils/artifacts/artifact-set-queries";
import { syncArtifactSetMembers } from "@/lib/utils/artifacts/sync-artifact-set-members";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  try {
    const { id, setId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const setRow = await findArtifactSetInCampaign(id, setId);

    if (!setRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(setRow);
  } catch (error) {
    console.error("Error fetching artifact set:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  try {
    const { id, setId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const existing = await findArtifactSetInCampaign(id, setId);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = patchArtifactSetSchema.parse(await request.json());

    let patch = data;

    if (data.icon !== undefined) {
      const raw =
        data.icon === null ? null : String(data.icon).trim() || null;

      const resolved = await resolveArtifactIconForPersistence(raw, {
        campaignId: id,
        objectBaseName: `${setId}-${randomUUID()}`,
      });

      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 422 });
      }

      patch = { ...data, icon: resolved.icon };
    }

    const updateData = buildArtifactSetPatchInput(patch);

    if (Object.keys(updateData).length > 0) {
      await updateArtifactSetRow(setId, updateData);
    }

    if (data.artifactIds !== undefined) {
      await syncArtifactSetMembers(id, setId, data.artifactIds);
    }

    const full = await reloadArtifactSetDetail(setId);

    return NextResponse.json(full);
  } catch (error) {
    console.error("Error updating artifact set:", error);

    const known = toArtifactSetErrorResponse(error);

    if (known) return known;

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  try {
    const { id, setId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const existing = await findArtifactSetInCampaign(id, setId);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deleteArtifactSetAndClearArtifacts(id, setId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting artifact set:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
