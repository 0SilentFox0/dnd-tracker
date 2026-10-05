import { addSummonMutation, summonSchema } from "./add-summon-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: "dm",
    requireStatus: "active",
    schema: summonSchema,
    mutate: addSummonMutation,
  });
}
