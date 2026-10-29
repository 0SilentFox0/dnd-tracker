import type { Translator } from "@/lib/i18n/translator";

export const withAbilityErrors = (label: string, errorCount: number, t: Translator) => (errorCount > 0 ? t("save.labelWithErrors", { label, count: errorCount }) : label);
