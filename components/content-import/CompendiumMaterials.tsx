"use client";
import { Button } from "@/components/ui/button";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { ChapterBlock } from "@/lib/utils/compendium-import/categories";
import { NOTES_LIMIT_BYTES } from "@/lib/utils/compendium-import/categories";

const kb = (bytes: number) => Math.round(bytes / 1024);

export function CompendiumMaterials({ blocks, excluded, busy, onChange }: { blocks: ChapterBlock[]; excluded: string[]; busy: boolean; onChange: (excluded: string[]) => void }) {
  const t = useTranslator("compendium");

  if (!blocks.length) return null;

  const toggle = (paths: string[], on: boolean) => onChange(on ? excluded.filter(path => !paths.includes(path)) : [...new Set([...excluded, ...paths])]);

  return <div className="space-y-2">
    {blocks.map(block => {
      const paths = block.chapters.map(chapter => chapter.path);

      const chosen = paths.filter(path => !excluded.includes(path)).length;

      return <details className="rounded-lg border border-hud-rule p-2 text-sm" key={`${block.kind}:${block.index}`}>
        <summary className="cursor-pointer text-hud-gold">{t("materials.summary", { title: block.title, chosen, total: paths.length })}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => toggle(paths, true)}>{t("materials.all")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => toggle(paths, false)}>{t("materials.none")}</Button>
        </div>
        {block.chapters.map(chapter => <label className="mt-1 flex items-start gap-2" key={chapter.path}>
          <input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!excluded.includes(chapter.path)} disabled={busy} onChange={e => toggle([chapter.path], e.target.checked)} />
          <span className="min-w-0 break-words">{chapter.name ?? t("categoriesStep.chapterDefault", { n: chapter.n })}{chapter.oversized && <span className="text-hud-bad"> — {t("materials.oversized", { kb: kb(chapter.bytes), limit: kb(NOTES_LIMIT_BYTES) })}</span>}</span>
        </label>)}
      </details>;
    })}
  </div>;
}
