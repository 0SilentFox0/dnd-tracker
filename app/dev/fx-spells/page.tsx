import { notFound } from "next/navigation";

import { FxSpells } from "@/components/battle/fx-lab/spells/FxSpells";
import type { SpellCardData } from "@/components/battle/fx-lab/spells/types";
import { SPELLS } from "@/data/library/spells";
import { iconPublicUrl } from "@/data/skill-icons";
import { previewSpellFx } from "@/lib/utils/battle/fx/spell-preview";

export const metadata = { title: "Заклинання та ефекти" };

export default function FxSpellsPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const spells: SpellCardData[] = SPELLS.map((spell) => ({ ...previewSpellFx(spell), icon: supabaseUrl && spell.iconKey ? iconPublicUrl(supabaseUrl, spell.iconKey, "spell") : null }));

  return <FxSpells spells={spells} />;
}
