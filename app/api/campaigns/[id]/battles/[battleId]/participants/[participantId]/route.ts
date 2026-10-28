import { runBattleMutation } from "@/lib/server/battles/run-mutation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string; participantId: string }> },
) {
  return runBattleMutation(req, { params: await params, operation: "participants.patch" });
}
