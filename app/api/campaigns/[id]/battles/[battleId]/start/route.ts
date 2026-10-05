import { createStartMutation } from "./start-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createStartMutation();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, { params: await params, access: "dm", requireStatus: "prepared", mutate });
}
