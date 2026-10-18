"use client";

import Link from "next/link";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { QueryState } from "@/components/common/states";
import { useBattleScene } from "@/lib/hooks/battle";
import { useBattleSummary } from "@/lib/hooks/battles";
import { cn } from "@/lib/utils";
import { HERO_STATUS_LABEL, resolveOutcome } from "@/lib/utils/battle/view";
import type { BattleSummaryHero } from "@/types/api";

const HEADLINE = {
  victory: { text: "Перемога", tone: "text-[var(--gold)]" },
  defeat: { text: "Поразка", tone: "text-[var(--enemy)]" },
  unknown: { text: "Бій завершено", tone: "text-[var(--ink)]" },
} as const;

const STATS: Array<{ key: "damageDealt" | "healingDone" | "kills" | "damageTaken"; label: string }> = [
  { key: "damageDealt", label: "Урон" },
  { key: "healingDone", label: "Лікування" },
  { key: "kills", label: "Вбивства" },
  { key: "damageTaken", label: "Отримано" },
];

function HeroCard({ hero }: { hero: BattleSummaryHero }) {
  return (
    <li className="border border-white/[.18] bg-black/30 p-3">
      <div className="flex items-center gap-3">
        {hero.avatar && <OptimizedImage src={hero.avatar} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />}
        <span className="hud-sc min-w-0 flex-1 truncate text-[17px] tracking-[.06em] text-[var(--ink)]">{hero.name}</span>
        <span className={cn("text-sm", hero.status === "active" ? "text-[#9fcf9a]" : "text-[#e9a08f]")}>{HERO_STATUS_LABEL[hero.status]}</span>
      </div>
      <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
        {STATS.map(({ key, label }) => (
          <div key={key}>
            <dd className="hud-sc text-[20px] font-bold text-[var(--ink)]">{hero[key]}</dd>
            <dt className="text-[11px] text-[var(--hud-muted)]">{label}</dt>
          </div>
        ))}
      </dl>
    </li>
  );
}

export function BattleResultScreen() {
  const { campaignId, battleId, battle, isDM, resultScreen } = useBattleScene();

  const summary = useBattleSummary(campaignId, battleId, resultScreen.open);

  if (!resultScreen.open) return null;

  const outcome = summary.data?.outcome ?? resolveOutcome(battle.battleLog ?? [], battle.initiativeOrder);

  const headline = HEADLINE[outcome ?? "unknown"];

  const exitHref = isDM ? `/campaigns/${campaignId}/dm/battles` : `/campaigns/${campaignId}`;

  return (
    <div role="dialog" aria-label="Підсумок бою" className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto bg-[radial-gradient(circle_at_50%_30%,rgba(60,48,24,.9),rgba(8,7,6,.97)_65%)] px-4 py-10 text-center">
      <div className="my-auto flex w-full max-w-xl flex-col items-center">
        <h2 className={cn("hud-sc text-[44px] font-extrabold tracking-[.14em]", headline.tone)}>{headline.text}</h2>
        <p className="mt-1 text-sm text-[var(--hud-muted)]">Раундів: {summary.data?.rounds ?? battle.currentRound}</p>
        <div className="mt-6 w-full text-left">
          <QueryState query={summary} loading={<p className="text-center text-sm text-[var(--hud-muted)]">Рахуємо підсумок…</p>}>
            {(data) => (
              <ul className="flex flex-col gap-2">
                {data.heroes.map((hero) => <HeroCard key={hero.participantId} hero={hero} />)}
              </ul>
            )}
          </QueryState>
        </div>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Link href={exitHref} className="hud-sc flex h-[52px] items-center justify-center border border-hud-gold-strong bg-[#8a6414] text-[17px] font-bold tracking-[.06em] text-[#fff3d1]">Вийти в меню</Link>
          <button type="button" onClick={() => resultScreen.setOpen(false)} className="hud-sc flex h-11 items-center justify-center border border-white/[.25] text-[15px] tracking-[.06em] text-[var(--ink)]">Переглянути бій</button>
        </div>
      </div>
    </div>
  );
}
