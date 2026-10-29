"use client";

import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SheetLine } from "@/types/characters";

export function useSheetLine() {
  const t = useTranslator();

  return (line: SheetLine) => `${translateIssue(t, { message: line.label, params: line.params })}${line.suffix ?? ""}`;
}

export function Breakdown({ lines }: { lines: SheetLine[] }) {
  const text = useSheetLine();

  return (
    <ul className="mt-2 space-y-0.5 border-t border-hud-rule pt-2 text-xs text-[#b8ab95]">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span className="min-w-0 break-words">{text(l)}</span>
          {l.value && <span className="shrink-0 tabular-nums text-hud-ink">{l.value}</span>}
        </li>
      ))}
    </ul>
  );
}
