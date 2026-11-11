import { SYSTEM_META } from "@/lib/utils/rules/systems/meta";

/** Rule-system key -> module; an include may only pull rows from a pack of the same module. */
export const SYSTEM_MODULE: Readonly<Record<string, string>> = Object.fromEntries(SYSTEM_META.flatMap((meta) => meta.keys.map((key) => [key, meta.module])));
