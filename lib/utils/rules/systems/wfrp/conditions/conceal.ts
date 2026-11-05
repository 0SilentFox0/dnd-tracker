import { textRef } from "@/lib/i18n/text-ref";
import type { LogLine } from "@/types/text";

export function concealWfrpLine(line: LogLine): LogLine {
  if (typeof line === "string") return line;

  const { message, params } = line;

  if (message === "battleWfrp.log.applied") {
    const { level: _level, ...rest } = params ?? {};

    return textRef("battleWfrp.log.appliedHidden", rest);
  }

  if (message === "battleWfrp.log.endTestSuccess" || message === "battleWfrp.log.endTestFail") {
    const { target: _target, ...rest } = params ?? {};

    return textRef(`${message}Hidden`, rest);
  }

  return line;
}
