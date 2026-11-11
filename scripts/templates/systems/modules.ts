import { presetsOf } from "@/lib/utils/rules/systems/catalog";
import { SYSTEM_META, type SystemMeta } from "@/lib/utils/rules/systems/meta";

export const systemBases = (metas: readonly SystemMeta[] = SYSTEM_META): Record<string, string> => Object.fromEntries(Object.entries(presetsOf(metas)).map(([key, preset]) => [key, preset.base]));

/** Rule-system key -> base module; an include may only pull rows from a pack of the same base. */
export const SYSTEM_MODULE: Readonly<Record<string, string>> = systemBases();
