"use client";

import { useTranslations } from "next-intl";

import type { Namespace } from "./config";
import type { Translator } from "./translator";

// the typed next-intl keys reject the dynamic keys (`errors.${code}`, issue.message) that shared helpers take
export function useTranslator(namespace?: Namespace): Translator {
  return useTranslations(namespace as Namespace) as unknown as Translator;
}
