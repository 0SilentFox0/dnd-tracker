import { LEGEND_KINDS } from "@/lib/constants/scenario";
import type { Translator } from "@/lib/i18n/translator";
import type { LegendEntry } from "@/types/scenario";

export const buildDefaultLegend = (t: Translator): LegendEntry[] => LEGEND_KINDS.map((kind) => ({ kind, label: t(`legendKinds.${kind}`) }));
