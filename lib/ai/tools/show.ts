import { z } from "zod";

import { defineTool } from "./define";

import "server-only";
import { readShowState } from "@/lib/server/show/show-store";

export async function showSummary(campaignId: string): Promise<string | null> {
  const s = await readShowState(campaignId);

  if (!s?.slide) return null;

  return [`Набір: ${s.deckTitle ?? "—"}`, `Слайд: ${s.slide.title ?? "без назви"}`, s.slide.caption && `Підпис: ${s.slide.caption}`, s.battle && `Гравців кличуть у бій: ${s.battle.name}`]
    .filter(Boolean)
    .join("\n");
}

export const getShowStateTool = defineTool({
  name: "get_show_state",
  scopes: ["ai"],
  title: "Поточний показ",
  description: "What the players currently see on the show screen: deck, slide title and caption, battle call.",
  input: z.object({}),
  handler: async (ctx) => (await showSummary(ctx.campaignId)) ?? "Показ зараз не запущено",
});
