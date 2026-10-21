import { createApiTokenHandler, listApiTokensHandler } from "./token-handlers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return listApiTokensHandler((await params).id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return createApiTokenHandler(req, (await params).id);
}
