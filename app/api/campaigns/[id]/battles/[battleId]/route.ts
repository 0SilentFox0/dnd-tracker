import { BATTLE_VERSION_ONLY_PARAM } from "@/lib/constants/battle";
import { battleRecordHttp } from "@/lib/server/battles/http";
import { readBattleScene, readBattleVersion } from "@/lib/server/battles/read-battle";
type Params = { params: Promise<{ id: string; battleId: string }> };
export async function GET(req: Request, { params }: Params) {
  if (new URL(req.url).searchParams.has(BATTLE_VERSION_ONLY_PARAM)) return readBattleVersion(await params);

  return readBattleScene(await params);
}


export async function PATCH(req: Request, { params }: Params) { const { id, battleId } = await params;

 return battleRecordHttp(req, id, "patch", battleId); }
export async function DELETE(req: Request, { params }: Params) { const { id, battleId } = await params;

 return battleRecordHttp(req, id, "delete", battleId); }
