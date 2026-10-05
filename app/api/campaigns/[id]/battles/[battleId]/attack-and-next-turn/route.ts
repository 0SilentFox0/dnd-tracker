import { attackBodySchema, attackMutation } from "../attack/attack-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

// сумісність для нинішнього клієнта: атака + перехід ходу одним запитом
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: "member",
    requireStatus: "active",
    rateLimitScope: "attack",
    schema: attackBodySchema,
    mutate: (ctx, body) => attackMutation(ctx, { ...body, endTurn: true }),
  });
}
