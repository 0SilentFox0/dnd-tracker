import { nextTurnMutation } from "./next-turn-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: "currentController",
    requireStatus: "active",
    rateLimitScope: "nextTurn",
    mutate: nextTurnMutation,
  });
}
