import { readBattleSummary } from "@/lib/utils/battle/pipeline/read-battle";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return readBattleSummary(await params);
}
