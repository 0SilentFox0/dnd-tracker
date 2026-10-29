import { createTranslator } from "use-intl/core";

import { joinSegments, type Segment } from "./segments";

import type { Translator } from "@/lib/i18n/translator";
import ukMessages from "@/messages/uk/abilityRegistry.json";

// i18n part 6: battle log is Ukrainian-only, so it renders segments with the uk catalog synchronously
const t = createTranslator({
  locale: "uk",
  messages: ukMessages,
  getMessageFallback: ({ key }) => key,
  onError: () => {},
} as Parameters<typeof createTranslator>[0]) as unknown as Translator;

export const logText = (list: readonly Segment[]): string => joinSegments(t, list);
