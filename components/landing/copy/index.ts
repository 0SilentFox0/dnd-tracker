import { en } from "@/components/landing/copy/en";
import type { LandingCopy, Locale } from "@/components/landing/copy/types";
import { uk } from "@/components/landing/copy/uk";

const COPY: Record<Locale, LandingCopy> = { en, uk };

export function getCopy(locale: Locale): LandingCopy {
  return COPY[locale];
}
