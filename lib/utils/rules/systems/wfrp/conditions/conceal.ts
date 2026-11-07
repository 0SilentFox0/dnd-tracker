import { textRef } from "@/lib/i18n/text-ref";
import type { LogLine } from "@/types/text";

export function concealWfrpLine(line: LogLine): LogLine {
  if (typeof line === "string") return line;

  const { message, params } = line;

  if (message === "battleWfrp.log.applied") {
    const { level: _level, ...rest } = params ?? {};

    return textRef("battleWfrp.log.appliedHidden", rest);
  }

  if (message === "battleWfrp.log.endTestSuccess" || message === "battleWfrp.log.endTestFail" || message === "battleWfrp.log.psychologyPass" || message === "battleWfrp.log.psychologyFail") {
    const { target: _target, ...rest } = params ?? {};

    return textRef(`${message}Hidden`, rest);
  }

  return line;
}

const MISCAST_LINES: ReadonlySet<string> = new Set(["wfrpMagic.log.miscast", "wfrpMagic.log.wrath"]);

const isMiscastSource = (v: unknown): boolean => typeof v === "object" && v !== null && "message" in v && String(v.message).startsWith("wfrpMagic.miscast.");

export function isWfrpMiscastLine(line: LogLine): boolean {
  if (typeof line === "string") return false;

  return MISCAST_LINES.has(line.message) || isMiscastSource(line.params?.source);
}
