import { commandBattleAudio, readBattleAudio } from "./audio-handler";

type Params = { params: Promise<{ id: string; battleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  return readBattleAudio(await params);
}

export async function POST(req: Request, { params }: Params) {
  return commandBattleAudio(req, await params);
}
