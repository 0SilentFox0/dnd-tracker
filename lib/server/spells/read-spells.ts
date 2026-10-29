import { NextResponse } from "next/server";

import { getCachedSpells } from "@/lib/cache/reference-data";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { readSpellLists } from "@/lib/utils/characters/choices/read";
import type { SpellRef } from "@/types/choices";

/** `GET …/spells`; the DM spells page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readSpells({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    return NextResponse.json(await getCachedSpells(id), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list spells" });
  }
}

/** `GET …/spells/refs`: лише {id,name,level,lists} для редакторів вибору — без описів і ефектів. */
export async function readSpellRefs({ id }: { id: string }): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const spells = await getCachedSpells(id);

    const refs: SpellRef[] = spells.map((s) => ({ id: s.id, name: s.name, level: s.level, lists: readSpellLists(s.lists) }));

    return NextResponse.json(refs, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list spell refs" });
  }
}
