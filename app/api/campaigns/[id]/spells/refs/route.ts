import { readSpellRefs } from "@/lib/server/spells/read-spells";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return readSpellRefs({ id: (await params).id });
}
