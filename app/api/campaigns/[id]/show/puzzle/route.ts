import { commandPuzzle } from "./puzzle-handler";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return commandPuzzle(req, (await params).id);
}
