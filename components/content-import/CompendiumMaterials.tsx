"use client";
import { Button } from "@/components/ui/button";
import type { ChapterBlock } from "@/lib/utils/compendium-import/categories";
import { NOTES_LIMIT_BYTES } from "@/lib/utils/compendium-import/categories";

const kb = (bytes: number) => Math.round(bytes / 1024);

export function CompendiumMaterials({ blocks, excluded, busy, onChange }: { blocks: ChapterBlock[]; excluded: string[]; busy: boolean; onChange: (excluded: string[]) => void }) {
  if (!blocks.length) return null;

  const toggle = (paths: string[], on: boolean) => onChange(on ? excluded.filter(path => !paths.includes(path)) : [...new Set([...excluded, ...paths])]);

  return <div className="space-y-2">
    {blocks.map(block => {
      const paths = block.chapters.map(chapter => chapter.path);

      const chosen = paths.filter(path => !excluded.includes(path)).length;

      return <details className="rounded-lg border border-hud-rule p-2 text-sm" key={`${block.kind}:${block.index}`}>
        <summary className="cursor-pointer text-hud-gold">{block.title} · обрано {chosen} з {paths.length}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => toggle(paths, true)}>Усі</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => toggle(paths, false)}>Жодного</Button>
        </div>
        {block.chapters.map(chapter => <label className="mt-1 flex items-start gap-2" key={chapter.path}>
          <input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!excluded.includes(chapter.path)} disabled={busy} onChange={e => toggle([chapter.path], e.target.checked)} />
          <span className="min-w-0 break-words">{chapter.name}{chapter.oversized && <span className="text-hud-bad"> — завеликий (≈{kb(chapter.bytes)} КБ, ліміт нотаток {kb(NOTES_LIMIT_BYTES)} КБ): може не імпортуватись</span>}</span>
        </label>)}
      </details>;
    })}
  </div>;
}
