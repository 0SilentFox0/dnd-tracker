import { searchMentionsHandler } from "./mentions-handler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return searchMentionsHandler(req, (await params).id);
}
