import { pluralUk } from "@/lib/utils/common/plural";
import type { AiFocus } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

const rowWord = (n: number) => pluralUk(n, ["рядок", "рядки", "рядків"]);

export function focusLabelOf(page: ScenarioPage | undefined, focus: AiFocus | undefined): string | null {
  if (!focus) return null;

  if (focus.kind === "character") return `Фокус: герой ${focus.characterId}`;

  if (focus.kind === "battle") return `Фокус: бій ${focus.battleId}`;

  if (focus.kind === "campaign") return "Фокус: кампанія";

  if (!page || focus.pageId !== page.id) return `Фокус: сторінка ${focus.pageId}`;

  const section = page.content.sections.find((s) => s.id === focus.sectionId);

  const rows = focus.rowIds?.length ?? 0;

  if (!section) return rows ? `Фокус: ${rows} ${rowWord(rows)}` : null;

  return rows ? `Фокус: розділ «${section.title}», ${rows} ${rowWord(rows)}` : `Фокус: розділ «${section.title}»`;
}
