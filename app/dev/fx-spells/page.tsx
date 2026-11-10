import { notFound } from "next/navigation";

import { FxSpells } from "@/components/battle/dev/spells/FxSpells";
import type { SpellCardData } from "@/components/battle/dev/spells/types";
import { SPELL_FX_BY_NAME } from "@/data/library/spell-fx-by-name";
import { SPELLS } from "@/data/library/spells";
import { iconPublicUrl } from "@/data/skill-icons";
import { libraryPreviewSpell, previewSpellFx } from "@/lib/utils/battle/fx/spell-preview";

export const metadata = { title: "Spells and effects" };

export default function FxSpellsPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const spells: SpellCardData[] = SPELLS.map((spell) => ({ ...previewSpellFx(spell, SPELL_FX_BY_NAME[spell.name]), previewSpell: libraryPreviewSpell(spell, SPELL_FX_BY_NAME[spell.name]), icon: supabaseUrl && spell.iconKey ? iconPublicUrl(supabaseUrl, spell.iconKey, "spell") : null }));

  return <FxSpells spells={spells} />;
}
