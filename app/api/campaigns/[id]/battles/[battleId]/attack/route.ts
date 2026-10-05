import { attackBodySchema, attackMutation } from "./attack-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

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
    mutate: attackMutation,
  });
}
