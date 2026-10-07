import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { toArtifactSetErrorResponse } from "../route-errors";
import { patchArtifactSetSchema } from "../schemas";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
import { readAbilities } from "@/lib/utils/abilities/read";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
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
      return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    const { abilities, issues: abilityIssues } = readAbilities("artifactSet", setRow);

    return NextResponse.json({ ...setRow, abilities, abilityIssues });
  } catch (error) {
    return handleApiError(error, { action: "fetch artifact set" });
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
      return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    const data = await parseBody(patchArtifactSetSchema, request);

    if (data instanceof NextResponse) return data;

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
    const known = toArtifactSetErrorResponse(error);

    if (known) return known;

    return handleApiError(error, { action: "update artifact set" });
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
      return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    await deleteArtifactSetAndClearArtifacts(id, setId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete artifact set" });
  }
}
