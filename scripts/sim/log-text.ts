import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "use-intl/core";

import { NAMESPACES } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translator";
import { formatBattleLog } from "@/lib/utils/battle/log/lines";
import type { LogLine } from "@/types/text";

const messages = Object.fromEntries(NAMESPACES.map((ns) => [ns, JSON.parse(readFileSync(join(process.cwd(), "messages", "uk", `${ns}.json`), "utf8"))]));

const t = createTranslator({ locale: "uk", messages, onError: () => {}, getMessageFallback: ({ namespace, key }) => (namespace ? `${namespace}.${key}` : key) } as Parameters<typeof createTranslator>[0]) as unknown as Translator;

/** The uk text of a log event (delta entry or stored row); undefined when there is no event. */
type LogEvent = { resultText?: string; log?: LogLine[] };

export function resultTextOf(event: LogEvent): string;
export function resultTextOf(event: LogEvent | null | undefined): string | undefined;
export function resultTextOf(event: LogEvent | null | undefined): string | undefined {
  return event ? formatBattleLog(t, { resultText: event.resultText ?? "", log: event.log }) : undefined;
}
