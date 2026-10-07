"use client";

import { useRef } from "react";
import { Highlighter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toggleHighlight } from "@/lib/utils/characters/biography";

export function BiographyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const mark = () => {
    const el = ref.current;

    if (!el) return;

    const next = toggleHighlight(value, el.selectionStart, el.selectionEnd);

    onChange(next.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">БІОГРАФІЯ</span>
        <Button type="button" size="sm" variant="outline" className="h-10 gap-1.5" onMouseDown={(e) => e.preventDefault()} onClick={mark}>
          <Highlighter className="size-4" />
          Маркер
        </Button>
      </div>
      <Textarea ref={ref} aria-label="Біографія" value={value} onChange={(e) => onChange(e.target.value)} rows={12} className="font-[family-name:var(--font-hud-book)] text-[15px]" />
      <p className="text-xs text-hud-muted">Виділіть фрагмент і натисніть «Маркер» — гравець побачить його підсвіченим. Натискання всередині підсвіченого знімає виділення. Порожній рядок починає новий абзац.</p>
    </div>
  );
}
