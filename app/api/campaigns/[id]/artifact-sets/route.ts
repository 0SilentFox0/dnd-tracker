import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { readArtifactSets } from "./read-artifact-sets";
import { toArtifactSetErrorResponse } from "./route-errors";

import { createArtifactSetSchema } from "@/lib/schemas/artifact-sets";
import {
  insertArtifactSet,
  reloadArtifactSetWithArtifacts,
} from "@/lib/server/artifacts/artifact-set-queries";
import { syncArtifactSetMembers } from "@/lib/server/artifacts/sync-artifact-set-members";
import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return readArtifactSets({ id });
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

    const data = await parseBody(createArtifactSetSchema, request);

    if (data instanceof NextResponse) return data;

    let icon: string | null | undefined = data.icon;

    if (data.icon !== undefined) {
      const resolved = await resolveArtifactIconForPersistence(data.icon, {
        campaignId: id,
        objectBaseName: randomUUID(),
      });

      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 422 });
      }

      icon = resolved.value;
    }

    const created = await insertArtifactSet(id, {
      name: data.name,
      description: data.description ?? null,
      setBonus: data.setBonus,
      icon,
      abilities: data.abilities,
    });

    if (data.artifactIds?.length) {
      await syncArtifactSetMembers(id, created.id, data.artifactIds);
    }

    const full = await reloadArtifactSetWithArtifacts(created.id);

    return NextResponse.json(full);
  } catch (error) {
    const known = toArtifactSetErrorResponse(error);

    if (known) return known;

    return handleApiError(error, { action: "create artifact set" });
  }
}
