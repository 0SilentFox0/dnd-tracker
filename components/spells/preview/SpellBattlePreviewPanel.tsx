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
import { IMPACT_MS } from "@/lib/utils/battle/fx";
import { PREVIEW_UNITS, type PreviewUnit } from "@/lib/utils/battle/fx/preview-units";
import { castableOf, previewCastFx, type PreviewSpell } from "@/lib/utils/battle/fx/spell-preview";

const RUNNER: FxRunner = { play: playFx, cancel: cancelLayer };

const [CASTER] = PREVIEW_UNITS;

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[.04] px-2 py-0.5 text-[11px] leading-4">
      <span className="text-[#a8987c]">{label}</span>
      {children}
    </span>
  );
}

export default function SpellBattlePreviewPanel({ spell, className }: { spell: PreviewSpell; className?: string }) {
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
      unit={unit}
      target={targets.find((t) => t.id === unit.id)}
      hit={fx.enabled && spec ? { token, delayMs: IMPACT_MS[spec.archetype] } : null}
      aurasOn={settled}
      still={!fx.motionAllowed}
    />
  );

  return (
    <section
      aria-label="Ефект у бою"
      className={cn("fx-preview rounded-xl border border-black/50 bg-[rgba(17,14,11,.94)] p-2.5 text-[13px] not-italic text-[#e6dccb] shadow-[inset_0_0_0_1px_rgba(230,194,90,.14)]", className)}
    >
      {fx.userEnabled && (
        <div ref={arenaRef} data-testid="spell-preview-arena" className={cn("relative mb-2 grid gap-x-6 py-3", others.length ? "grid-cols-2" : "grid-cols-1 justify-items-center")}>
          <div className="w-full max-w-[220px] self-center">{row(CASTER)}</div>
          {others.length > 0 && <div className="space-y-1.5">{others.map(row)}</div>}
          <div ref={layerRef} className="fx-layer" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {spec && (
          <>
            <Chip label="Анімація">{ARCHETYPE_LABEL[spec.archetype]}</Chip>
            <Chip label="Стихія">
              <span aria-hidden className="size-2 rounded-full" style={{ background: PALETTE[spec.element].core }} />
              {ELEMENT_LABEL[spec.element]}
            </Chip>
          </>
        )}
        {auras.length > 0 && <Chip label="Аура">{auras.map((a) => AURA_LABEL[a]).join(", ")}</Chip>}
        {fx.enabled && spec && (
          <button
            type="button"
            onClick={replay}
            className="ml-auto inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[11px] text-[#e6c25a] shadow-[inset_0_0_0_1px_rgba(230,194,90,.45)] hover:bg-white/5"
          >
            <Play className="size-3" aria-hidden />
            Показати ще раз
          </button>
        )}
      </div>
    </section>
  );
}
