import { revokeApiTokenHandler } from "../token-handlers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; tokenId: string }> }) {
  const { id, tokenId } = await params;

  return revokeApiTokenHandler(id, tokenId);
}
