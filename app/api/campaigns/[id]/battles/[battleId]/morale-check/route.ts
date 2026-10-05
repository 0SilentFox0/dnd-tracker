import { moraleCheckMutation } from "./morale-check-mutation";

import { moraleCheckSchema } from "@/lib/schemas";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: "member",
    requireStatus: "active",
    schema: moraleCheckSchema,
    respond: "wrapped",
    mutate: moraleCheckMutation,
  });
}
