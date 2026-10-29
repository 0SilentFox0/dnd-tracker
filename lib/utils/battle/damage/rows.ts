import { capitalizeLine } from "@/lib/i18n/text-ref";
import type { DamageRow } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const ruleRow = (): DamageRow => ({ label: "", tone: "rule" });

export const stepRow = (label: LogLine, value: string | number, source?: LogLine): DamageRow => ({ label, value: String(value), tone: "step", ...(source && { source }) });

export const totalRow = (label: LogLine, value: string | number): DamageRow => ({ label, value: String(value), tone: "total" });

export const multiplierRow = (label: LogLine, multiplier: number | string, result: number): DamageRow => totalRow(capitalizeLine(label), `×${multiplier} → ${result}`);
