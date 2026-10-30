import { DEFAULT_TEMPLATE_LOCALE } from "@/lib/constants/campaigns";
import type { TemplateCard } from "@/types/campaigns";
export interface TemplateVariant {
  name: string;
  locale?: string | null;
  templateKey?: string | null;
}

export interface TemplateGroup<T extends TemplateVariant = TemplateCard> {
  key: string;
  cards: Record<string, T>;
  locales: string[];
}

export const templateLocale = (card: TemplateVariant) => card.locale ?? DEFAULT_TEMPLATE_LOCALE;

export function groupTemplates<T extends TemplateVariant>(cards: T[]): TemplateGroup<T>[] {
  const groups = new Map<string, TemplateGroup<T>>();

  for (const card of cards) {
    const key = card.templateKey ?? card.name;

    const group = groups.get(key) ?? { key, cards: {}, locales: [] };

    group.cards[templateLocale(card)] = card;
    groups.set(key, group);
  }

  return [...groups.values()].map((g) => ({ ...g, locales: Object.keys(g.cards) }));
}

export function pickVariant<T extends TemplateVariant>(group: TemplateGroup<T>, uiLocale: string): T {
  return group.cards[uiLocale] ?? group.cards[DEFAULT_TEMPLATE_LOCALE] ?? Object.values(group.cards)[0];
}
