import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createBattleSchema } from "@/lib/schemas";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

type Params = { params: Promise<{ id: string; battleId: string }> };

const patchBattleSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    participants: createBattleSchema.shape.participants.optional(),
  })
  .strict();

function readBattle(params: { id: string; battleId: string }) {
  return runBattleMutation(new Request("http://internal/battle"), {
    params,
    access: BattleAccess.MEMBER,
    dryRun: () => true,
    includeRecentEvents: 100,
    mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }),
  });
}

export async function GET(_req: Request, { params }: Params) {
  return readBattle(await params);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const parsed = patchBattleSchema.safeParse(await request.json().catch(() => undefined));

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
    }

    const battle = await prisma.battleScene.findUnique({ where: { id: battleId }, select: { campaignId: true } });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.battleScene.update({ where: { id: battleId }, data: { ...parsed.data, version: { increment: 1 } } });

    return readBattle({ id, battleId });
  } catch (error) {
    return handleApiError(error, { action: "update battle" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.battleScene.delete({
      where: { id: battleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete battle" });
  }
}
