"use client";

import type { ReactNode } from "react";

import { EffectIcon, HealthBar, HealthLabel, Portrait } from "@/components/battle/hud";
import { useBattleSceneData } from "@/lib/hooks/battle";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { canSeeExactStats, effectSummary, formatKnownArmorClass, personalPassiveEffects, resolveKnownArmorClass, resolveObservedTraits } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h4 className="hud-sc flex h-5 items-center text-[13px] tracking-[.08em] text-[var(--hud-muted)]">{title}</h4>
      {children}
    </section>
  );
}

export function ParticipantDetails({ participant }: { participant: BattleParticipant }) {
  const { battle, viewer } = useBattleSceneData();

  const exact = canSeeExactStats(participant, viewer);

  const log = battle.battleLog ?? [];

  const effects = [...personalPassiveEffects(participant, battle.initiativeOrder), ...participant.battleData.activeEffects];

  const known = resolveKnownArmorClass(log, participant.basicInfo.id, battle.knowledge);

  const traits = exact ? [] : resolveObservedTraits(log, participant.basicInfo.id, battle.knowledge);

  return (
    <div className="text-[var(--bone)]">
      <div className="flex items-center gap-4">
        <Portrait participant={participant} size={64} />
        <div>
          <div className="hud-sc text-[22px] font-bold leading-7">{participant.basicInfo.name}</div>
          {exact ? <div className="text-sm text-[#d6cbb7]">{participant.combatStats.currentHp} / {participant.combatStats.maxHp}</div> : <HealthLabel participant={participant} />}
        </div>
      </div>
      <HealthBar participant={participant} exact={exact} className="mt-3" />
      <Section title="Броня">
        <div className="flex min-h-10 items-center justify-between border-b border-white/[.08]">
          <span>{exact ? "AC" : "AC між"}</span>
          <span className="font-medium text-[var(--ink)]">{exact ? getEffectiveArmorClass(participant, battle.initiativeOrder) : formatKnownArmorClass(known)}</span>
        </div>
        {!exact && known.evidence.map((e, i) => (
          <div key={i} className="flex min-h-8 items-center text-[13px] text-[var(--hud-muted)]">
            {e.hit ? "влучання" : "промах"} {e.total} · {e.actorName}, раунд {e.round}
          </div>
        ))}
      </Section>
      <Section title="Ефекти">
        {effects.length === 0 && <div className="py-2 text-sm text-[var(--hud-muted)]">немає</div>}
        {effects.map((e) => {
          return (
            <div key={e.id} className="flex gap-3 border-b border-white/[.08] py-2.5">
              <span className={e.type === "buff" ? "text-[#cdb87e]" : "text-hud-danger"}>
                <EffectIcon effect={e} size={36} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[15px] font-medium text-[var(--ink)]"><span>{e.name}</span><span className="text-[13px] font-normal text-[var(--hud-muted)]">{e.permanent ? "постійно" : `${e.duration} р.`}</span></div>
                {e.description ? <p className="mt-0.5 text-[13px] leading-[18px] text-[#a89c88]">{e.description}</p> : e.permanent && <p className="mt-0.5 text-[13px] leading-[18px] text-[#a89c88]">{effectSummary(e)[0]}</p>}
                {e.source && <p className="text-[13px] leading-[18px] text-[#a89c88]">Від: {e.source.abilityName ? `${e.source.abilityName} (${e.source.name})` : e.source.name}</p>}
              </div>
            </div>
          );
        })}
      </Section>
      {traits.length > 0 && (
        <Section title="Помічено в бою">
          {traits.map((t) => (
            <div key={t.label} className="flex min-h-10 items-center justify-between border-b border-white/[.08]">
              <span>{t.label}</span>
              <span className="font-medium text-[var(--ink)]">{t.kind === "immunity" ? "імунітет" : `${t.value}%`}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
