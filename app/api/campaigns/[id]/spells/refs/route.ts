import { readSpellRefs } from "../read-spells";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return readSpellRefs({ id: (await params).id });
}
