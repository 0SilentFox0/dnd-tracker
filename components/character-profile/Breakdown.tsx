import type { SheetLine } from "@/types/characters";

export function Breakdown({ lines }: { lines: SheetLine[] }) {
  return (
    <ul className="mt-2 space-y-0.5 border-t border-[#3a2e22] pt-2 text-xs text-[#b8ab95]">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span className="min-w-0 break-words">{l.label}</span>
          {l.value && <span className="shrink-0 tabular-nums text-[#efe5d2]">{l.value}</span>}
        </li>
      ))}
    </ul>
  );
}
