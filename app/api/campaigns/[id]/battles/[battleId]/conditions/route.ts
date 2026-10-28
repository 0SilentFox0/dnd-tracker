import { runBattleMutation } from "@/lib/server/battles/run-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, { params: await params, operation: "conditions" });
}
