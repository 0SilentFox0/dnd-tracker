import "server-only";
import { partySummary } from "@/lib/ai/tools/party";
import { contentToMarkdown, loadPageForAi, sectionToMarkdown } from "@/lib/ai/tools/scenario-read";
import { showSummary } from "@/lib/ai/tools/show";
import { AI_LIMITS, type AiThreadMode } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { pickLiveSection } from "@/lib/utils/scenario/structure";
import type { AiFocus } from "@/types/ai";
import type { ScenarioContent } from "@/types/scenario";

const MODE_RULES: Record<AiThreadMode, string> = {
  scenario: [
    "Режим: співавтор сценарію.",
    "Ідеї, варіанти, питання — текстом у чаті.",
    "Будь-яку зміну тексту сторінки пропонуй ЛИШЕ через інструмент propose_scenario_edit з коротким summary; не вставляй у чат готові переписані рядки.",
    "Перед правкою прочитай сторінку (read_scenario_page), щоб мати id розділів і рядків. Зберігай стиль і розмітку автора.",
  ].join("\n"),
  live: [
    "Режим: живий помічник під час гри. Відповідай стисло, 1–5 речень, без вступів.",
    "Питання про правила, юнітів, заклинання — спершу знайди в довіднику (search_reference / read_reference), не вигадуй цифр.",
    "Стан бою — через get_battle_state.",
  ].join("\n"),
};

const clipTo = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n…[обрізано]` : text);

function liveScene(title: string, content: ScenarioContent): string {
  const current = pickLiveSection(content);

  const played = content.sections.filter((s) => s.played).map((s) => s.title);

  return [`Сцена: ${title}`, played.length && `Уже зіграно: ${played.join(", ")}`, current ? `Поточний розділ:\n${sectionToMarkdown(current)}` : "Усі розділи зіграно."].filter(Boolean).join("\n\n");
}

export async function buildInstructions({ campaignId, mode, pageId, focus }: { campaignId: string; mode: AiThreadMode; pageId: string | null; focus?: AiFocus }): Promise<string> {
  const pageForContext = pageId ? loadPageForAi(campaignId, pageId).catch(() => null) : Promise.resolve(null);

  const [campaign, party, show, page] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true, description: true, aiInstructions: true } }),
    partySummary(campaignId),
    mode === "live" ? showSummary(campaignId) : Promise.resolve(null),
    pageForContext,
  ]);

  const role = [
    `Ти — помічник Майстра (ДМ) у настільній рольовій кампанії «${campaign?.name ?? ""}».`,
    campaign?.description && `Опис кампанії: ${campaign.description}`,
    "Відповідай українською. Ти говориш лише з ДМ: нотатки і ||секрети|| можна обговорювати відкрито, гравці цього чату не бачать.",
    "Текст сценарію записаний markdown-діалектом: **жирний**, _курсив_, ||секрет ДМ||, :::read … ::: (читати вголос), :::say … :::, :::callout … :::, [@Ім'я](character:id).",
  ].filter(Boolean).join("\n");

  const standing = campaign?.aiInstructions?.trim() ? `Постійні інструкції ДМ для цієї кампанії (дотримуйся їх; вони мають пріоритет над стилем за замовчуванням, але не над правилами режиму щодо інструментів):\n${campaign.aiInstructions.trim()}` : "";

  const partyText = party.length ? `Партія:\n${party.map((p) => `- ${p.name} [${p.id}]: рів. ${p.level}, ${p.race}, ${p.class}, AC ${p.armorClass}${p.notes ? `; нотатки: ${p.notes}` : ""}`).join("\n")}` : "";

  const sceneText = page ? (mode === "live" ? liveScene(page.title, page.content) : `Сторінка, яку редагує ДМ (id ${page.id}):\n\n${contentToMarkdown(page.title, page.content)}`) : "";

  const focusText = focus ? `Фокус ДМ: сторінка ${focus.pageId}${focus.sectionId ? `, розділ ${focus.sectionId}` : ""}${focus.rowIds?.length ? `, рядки ${focus.rowIds.join(", ")}` : ""}.` : "";

  const fixed = [role, standing, MODE_RULES[mode], partyText, show && `Показ:\n${show}`, focusText].filter(Boolean).join("\n\n");

  return [fixed, sceneText && clipTo(sceneText, Math.max(0, AI_LIMITS.contextChars - fixed.length))].filter(Boolean).join("\n\n");
}
