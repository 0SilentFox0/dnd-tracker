import { DEFAULT_TEMPLATE_LOCALE } from "@/lib/constants/campaigns";
import type { TemplateCard } from "@/types/campaigns";

export interface TemplateGroup {
  key: string;
  cards: Record<string, TemplateCard>;
  locales: string[];
}

export const templateLocale = (card: TemplateCard) => card.locale ?? DEFAULT_TEMPLATE_LOCALE;

export function groupTemplates(cards: TemplateCard[]): TemplateGroup[] {
  const groups = new Map<string, TemplateGroup>();

  for (const card of cards) {
    const key = card.templateKey ?? card.name;

    const group = groups.get(key) ?? { key, cards: {}, locales: [] };

    group.cards[templateLocale(card)] = card;
    groups.set(key, group);
  }

  return [...groups.values()].map((g) => ({ ...g, locales: Object.keys(g.cards) }));
}

export function pickVariant(group: TemplateGroup, uiLocale: string): TemplateCard {
  return group.cards[uiLocale] ?? group.cards[DEFAULT_TEMPLATE_LOCALE] ?? Object.values(group.cards)[0];
}
