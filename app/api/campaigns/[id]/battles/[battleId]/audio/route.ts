import { commandBattleAudio, readBattleAudio } from "@/lib/server/battles/mutations/audio/audio-handler";

type Params = { params: Promise<{ id: string; battleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, battleId } = await params;

  return readBattleAudio(id, battleId);
}

export async function POST(req: Request, { params }: Params) {
  const { id, battleId } = await params;

  return commandBattleAudio(req, id, battleId);
}
