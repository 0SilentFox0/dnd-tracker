import { commandShow, readShow } from "./show-handler";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return readShow((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return commandShow(req, (await params).id);
}
