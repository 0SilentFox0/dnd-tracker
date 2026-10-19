"use client";

import { type ReactNode, useMemo } from "react";
import { Play } from "lucide-react";

import "@/components/battle/fx/fx.css";
import { ARCHETYPE_LABEL, AURA_LABEL, ELEMENT_LABEL } from "@/components/battle/fx/labels";
import { PreviewUnitRow } from "@/components/battle/fx/preview/PreviewUnitRow";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { playFx } from "@/components/battle/fx/runtime/play";
import { cancelLayer } from "@/components/battle/fx/runtime/stage";
import { type FxRunner, useFxEnabled, useSpellFxPlayback } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";
import { PREVIEW_UNITS, type PreviewUnit } from "@/lib/utils/battle/fx/preview-units";
import { castableOf, previewCastFx, type PreviewSpell } from "@/lib/utils/battle/fx/spell-preview";

// a preview has no queue to hold up, so it waits for the signature however long its chunk takes
const RUNNER: FxRunner = { play: (layer, spec, root) => playFx(layer, spec, root, Infinity), cancel: cancelLayer };

const [CASTER] = PREVIEW_UNITS;

function Chip({ label, book, children }: { label: string; book: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4", book ? "border-[#7a2a1f]/40 bg-[#7a2a1f]/[.06] text-[#2a2018]" : "border-white/15 bg-white/[.04]")}>
      <span className={book ? "text-[#7a6650]" : "text-[#a8987c]"}>{label}</span>
      {children}
    </span>
  );
}

const BOOK_WASH = "radial-gradient(ellipse at 50% 45%, #3b2a1c 0%, #2a1d14 58%, rgba(42,29,20,.6) 82%, rgba(42,29,20,0) 100%)";

export default function SpellBattlePreviewPanel({ spell, className, variant = "hud" }: { spell: PreviewSpell; className?: string; variant?: "hud" | "book" }) {
  const book = variant === "book";

  const { id, name, level, groupId, rules } = spell;

  const preview = useMemo(() => previewCastFx(castableOf({ id, name, level, groupId, rules })), [id, name, level, groupId, rules]);

  const fx = useFxEnabled();

  const { spec, targets, targetIds, auras } = preview;

  const { arenaRef, layerRef, token, settled, replay } = useSpellFxPlayback(spec, fx.enabled, RUNNER);

  if (!spec && auras.length === 0) return null;

  const others = PREVIEW_UNITS.filter((u) => u.id !== CASTER.id && targetIds.includes(u.id));

  const row = (unit: PreviewUnit) => (
    <PreviewUnitRow
      key={unit.id}
      compact
      book={book}
      unit={unit}
      target={targets.find((t) => t.id === unit.id)}
      hit={fx.enabled && spec ? { token, delayMs: ARCHETYPE_FX[spec.archetype].impactMs } : null}
      aurasOn={settled}
      still={!fx.motionAllowed}
    />
  );

  return (
    <section
      aria-label="Ефект у бою"
      className={cn(
        "fx-preview text-[13px] not-italic",
        book ? "text-[#2a2018]" : "rounded-xl border border-black/50 bg-[rgba(17,14,11,.94)] p-2.5 text-[#e6dccb] shadow-[inset_0_0_0_1px_rgba(230,194,90,.14)]",
        className,
      )}
    >
      {fx.userEnabled && (
        <div className={cn(book && "mb-2 rounded-[2px] border border-[#7a2a1f] p-[3px]")}>
          <div
            ref={arenaRef}
            data-testid="spell-preview-arena"
            className={cn("relative grid gap-x-6 py-3", book ? "px-7 py-5 outline outline-1 -outline-offset-[1px] outline-[#7a2a1f]/50" : "mb-2", others.length ? "grid-cols-2" : "grid-cols-1 justify-items-center")}
            style={book ? { background: BOOK_WASH, boxShadow: "inset 0 0 22px 6px rgba(20,12,6,.55)" } : undefined}
          >
          <div className="w-full max-w-[220px] self-center">{row(CASTER)}</div>
          {others.length > 0 && <div className="space-y-1.5">{others.map(row)}</div>}
            <div ref={layerRef} className="fx-layer" />
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {spec && (
          <>
            <Chip book={book} label="Анімація">{ARCHETYPE_LABEL[spec.archetype]}</Chip>
            <Chip book={book} label="Стихія">
              <span aria-hidden className="size-2 rounded-full" style={{ background: PALETTE[spec.element].core }} />
              {ELEMENT_LABEL[spec.element]}
            </Chip>
          </>
        )}
        {auras.length > 0 && <Chip book={book} label="Аура">{auras.map((a) => AURA_LABEL[a]).join(", ")}</Chip>}
        {fx.enabled && spec && (
          <button
            type="button"
            onClick={replay}
            className={cn(
              "ml-auto inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[11px]",
              book ? "text-[#7a2a1f] shadow-[inset_0_0_0_1px_rgba(122,42,31,.6)] hover:bg-[#7a2a1f]/10" : "text-[#e6c25a] shadow-[inset_0_0_0_1px_rgba(230,194,90,.45)] hover:bg-white/5",
            )}
          >
            <Play className="size-3" aria-hidden />
            Показати ще раз
          </button>
        )}
      </div>
    </section>
  );
}
