import { completeBattleSchema, completeMutation } from "./complete-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: "dm",
    requireStatus: "active",
    schema: completeBattleSchema,
    mutate: completeMutation,
  });
}
