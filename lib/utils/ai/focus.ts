import type { Translator } from "@/lib/i18n/translator";
import type { AiFocus } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

export function focusLabelOf(t: Translator, page: ScenarioPage | undefined, focus: AiFocus | undefined): string | null {
  if (!focus) return null;

  if (focus.kind === "character") return t("focus.character", { id: focus.characterId });

  if (focus.kind === "battle") return t("focus.battle", { id: focus.battleId });

  if (focus.kind === "campaign") return t("focus.campaign");

  if (!page || focus.pageId !== page.id) return t("focus.page", { id: focus.pageId });

  const section = page.content.sections.find((s) => s.id === focus.sectionId);

  const rows = focus.rowIds?.length ?? 0;

  if (!section) return rows ? t("focus.rows", { rows }) : null;

  return rows ? t("focus.sectionRows", { title: section.title, rows }) : t("focus.section", { title: section.title });
}
