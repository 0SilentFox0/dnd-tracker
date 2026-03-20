import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { toArtifactSetErrorResponse } from "./route-errors";
import { createArtifactSetSchema } from "./schemas";

import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";
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

    let icon: string | null | undefined = data.icon;

    if (data.icon !== undefined) {
      const raw =
        data.icon === null ? null : String(data.icon).trim() || null;

      const resolved = await resolveArtifactIconForPersistence(raw, {
        campaignId: id,
        objectBaseName: randomUUID(),
      });

      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 422 });
      }

      icon = resolved.icon;
    }

    const created = await insertArtifactSet(id, {
      name: data.name,
      description: data.description ?? null,
      setBonus: data.setBonus,
      icon,
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
