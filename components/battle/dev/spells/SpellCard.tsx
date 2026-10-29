import type { ReactNode } from "react";
import { Play } from "lucide-react";

import type { SpellCardData } from "./types";

import { ARCHETYPE_LABEL, AURA_LABEL, ELEMENT_LABEL, FRAME_LABEL } from "@/components/battle/fx/labels";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { EntityIcon } from "@/components/common/EntityIcon";
import { HudCard, HudPill } from "@/components/hud/page";
import { lineKey } from "@/lib/i18n/text-ref";
import { useText } from "@/lib/i18n/use-text";

function FxField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-wide text-hud-muted uppercase">{label}</dt>
      <dd className="flex items-center gap-1.5 text-xs text-hud-bone">{children}</dd>
    </div>
  );
}

const list = (items: string[]) => (items.length ? items.join(", ") : "—");

export function SpellCard({ spell, onPlay }: { spell: SpellCardData; onPlay: (spell: SpellCardData) => void }) {
  const text = useText();

  const { spec } = spell;

  return (
    <HudCard accent={spec ? PALETTE[spec.element].core : undefined}>
      <article aria-label={spell.name} className="flex gap-3">
        <EntityIcon src={spell.icon} name={spell.name} size={48} className="size-12 rounded-lg bg-[#241d16] text-hud-bone" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="hud-sc font-bold text-hud-ink">{spell.name}</h3>
              <p className="text-[11px] text-hud-muted">
                {spell.level} рівень · {spell.school} · {spell.targeting}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPlay(spell)}
              aria-label={`Програти: ${spell.name}`}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#2a1d05] [background:linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)]"
            >
              <Play className="size-3.5" />
            </button>
          </div>
          <p className="text-sm text-hud-bone">{spell.description}</p>
          <div className="flex flex-wrap gap-1">
            {spell.effects.map((e) => (
              <HudPill key={lineKey(e)} tone="muted">
                {text(e)}
              </HudPill>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-2 border-t border-white/[.08] pt-2 sm:grid-cols-4">
            <FxField label="Анімація">{spec ? ARCHETYPE_LABEL[spec.archetype] : "—"}</FxField>
            <FxField label="Стихія">
              {spec ? (
                <>
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[spec.element].core }} />
                  {ELEMENT_LABEL[spec.element]}
                </>
              ) : (
                "—"
              )}
            </FxField>
            <FxField label="Рамка влучання">{list(spell.frames.map((f) => FRAME_LABEL[f]))}</FxField>
            <FxField label="Аура">{list(spell.auras.map((a) => AURA_LABEL[a]))}</FxField>
          </dl>
          {spell.error && <p className="text-xs text-[#ff8a7a]">Не вдалося обчислити: {spell.error}</p>}
        </div>
      </article>
    </HudCard>
  );
}
