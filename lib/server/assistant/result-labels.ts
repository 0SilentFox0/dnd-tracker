import "server-only";
import type { Locale } from "@/lib/i18n/config";
import en from "@/messages/en/assistant.json";
import uk from "@/messages/uk/assistant.json";

export type ResultLabel = keyof typeof uk.results;

const RESULTS = { uk: uk.results, en: en.results } satisfies Record<Locale, Record<ResultLabel, string>>;

export const resultLabel = (locale: Locale, label: ResultLabel): string => RESULTS[locale][label];
