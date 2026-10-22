import Image from "next/image";

import { DEMO_STEPS } from "@/components/landing/content";
import { cn } from "@/lib/utils";

type Side = "ally" | "enemy";

type TokenIcon = "dwarf" | "wizard" | "bard" | "goblin" | "orc" | "owlbear";

interface DemoToken {
  name: string;
  icon: TokenIcon;
  side: Side;
  left: string;
  top: string;
  fx?: { fall?: boolean; hp: "ld-hp-a" | "ld-hp-b" };
}

const TOKENS: DemoToken[] = [
  { name: "Ельдрін", icon: "wizard", side: "ally", left: "15.625%", top: "45%" },
  { name: "Торвальд", icon: "dwarf", side: "ally", left: "28.125%", top: "65%" },
  { name: "Ліра", icon: "bard", side: "ally", left: "34.375%", top: "35%" },
  { name: "Гоблін", icon: "goblin", side: "enemy", left: "65.625%", top: "45%", fx: { fall: true, hp: "ld-hp-a" } },
  { name: "Орк", icon: "orc", side: "enemy", left: "71.875%", top: "65%", fx: { hp: "ld-hp-b" } },
  { name: "Сововедмідь", icon: "owlbear", side: "enemy", left: "84.375%", top: "35%" },
];

const SIDE_STYLE: Record<Side, { chip: string; token: string }> = {
  ally: { chip: "bg-[#1d2a38] ring-[#6f8fb0]", token: "bg-[#2d4560] ring-[#bcd3ea]" },
  enemy: { chip: "bg-[#3a1611] ring-[#c0503c]", token: "bg-[#6e1f15] ring-[#ffb4a6]" },
};

const SPELLS = [
  { name: "Вогняна куля", level: 3, hot: true },
  { name: "Щит", level: 1 },
  { name: "Магічна стріла", level: 1 },
];

function Glyph({ icon, className }: { icon: TokenIcon; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={className}>
      <use href={`/landing/tokens.svg#${icon}`} />
    </svg>
  );
}

export function D20({ value, className }: { value: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="#7a1b12" stroke="#ffcf7a" strokeWidth="3" />
      <polygon points="50,22 78,68 22,68" fill="#a3281b" stroke="#ffcf7a" strokeWidth="2" />
      <path d="M50 3 50 22 M93 27 78 68 M7 27 22 68 M50 97 22 68 M50 97 78 68 M93 73 78 68 M7 73 22 68 M7 27 50 22 93 27" stroke="#ffcf7a" strokeWidth="1.5" strokeOpacity=".6" fill="none" />
      <text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff4dc" fontFamily="Georgia, serif">
        {value}
      </text>
    </svg>
  );
}

function Token({ token }: { token: DemoToken }) {
  return (
    <span style={{ left: token.left, top: token.top }} className={cn("absolute -translate-x-1/2 -translate-y-1/2", token.fx?.fall && "ld-fall")}>
      <span
        className={cn(
          "relative grid size-8 place-items-center rounded-full text-white shadow-[0_4px_10px_rgba(0,0,0,.7)] ring-2 sm:size-12",
          SIDE_STYLE[token.side].token,
          token.name === "Ельдрін" && "ring-[#ffe08a] shadow-[0_0_0_3px_rgba(230,194,90,.35),0_0_18px_rgba(230,194,90,.6)]",
        )}
      >
        <Glyph icon={token.icon} className="size-5 sm:size-8" />
      </span>
      {token.fx && (
        <span className="absolute -bottom-2 left-1/2 h-1 w-8 -translate-x-1/2 overflow-hidden rounded-full bg-black/70 sm:w-10">
          <span className={cn("block h-full bg-[#c0503c]", token.fx.hp)} />
        </span>
      )}
    </span>
  );
}

function DmScreen() {
  return (
    <div className="overflow-hidden rounded-xl border border-hud-line bg-[#0e0b09] shadow-[0_40px_100px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.18),0_0_80px_-20px_rgba(230,140,60,.25)]">
      <div className="flex items-center gap-2 border-b border-hud-rule bg-[#15110d] px-3 py-1.5">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-[#5a3a2a]" />
          <span className="size-2 rounded-full bg-[#5a4a2a]" />
          <span className="size-2 rounded-full bg-[#3a4a2a]" />
        </span>
        <span className="hud-sc truncate text-[11px] text-hud-bone sm:text-xs">Екран ДМ · Гробниця Безіменного · раунд 2</span>
      </div>
      <div className="relative aspect-[8/5]">
        <Image src="/landing/battle-map.svg" alt="" fill unoptimized priority className="object-cover" />

        <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-1 bg-gradient-to-b from-black/85 to-transparent p-2 sm:gap-1.5 sm:p-3">
          {TOKENS.map((t) => (
            <span key={t.name} className={cn("hud-sc relative overflow-hidden rounded-md px-1.5 py-0.5 text-[10px] text-hud-ink ring-1 sm:text-xs", SIDE_STYLE[t.side].chip)}>
              {t.name === "Ельдрін" && <span aria-hidden className="ld-turn-a metal-gold metal-fill absolute inset-0" />}
              {t.name === "Торвальд" && <span aria-hidden className="ld-turn-b metal-gold metal-fill absolute inset-0" />}
              <span className="relative">{t.name}</span>
            </span>
          ))}
        </div>

        {TOKENS.map((t) => (
          <Token key={t.name} token={t} />
        ))}

        <span aria-hidden className="ld-ring absolute left-[68.75%] top-[55%] size-[30%] rounded-full border-2 border-[#ff9a4d] bg-[radial-gradient(circle,rgba(255,154,77,.35),rgba(255,90,30,.08)_60%,transparent_70%)]" />
        <span aria-hidden className="ld-orb absolute size-4 rounded-full bg-[radial-gradient(circle,#fff6d0,#ffb347_40%,#e0541c_70%,transparent_72%)] shadow-[0_0_24px_8px_rgba(255,120,40,.7)] sm:size-6" />
        <span aria-hidden className="ld-blast absolute left-[68.75%] top-[55%] -translate-x-1/2 -translate-y-1/2 scale-[1.6] sm:scale-[2.6]">
          <span className="ld-sprite ld-sprite-explosion block" />
        </span>
        <span aria-hidden className="ld-dmg-a hud-sc absolute left-[65.625%] top-[30%] text-lg font-bold text-hud-bad drop-shadow-[0_2px_2px_#000] sm:text-3xl">−24</span>
        <span aria-hidden className="ld-dmg-b hud-sc absolute left-[71.875%] top-[50%] text-base font-bold text-[#ffb36b] drop-shadow-[0_2px_2px_#000] sm:text-2xl">−12 ½</span>

        <span aria-hidden className="ld-die absolute left-1/2 top-[30%] size-12 sm:size-20">
          <span className="ld-die-roll absolute inset-0">
            <D20 value="?" className="size-full" />
          </span>
          <span className="ld-die-result absolute inset-0">
            <D20 value="7" className="size-full" />
          </span>
        </span>
        <span aria-hidden className="ld-check hud-sc absolute left-1/2 top-[46%] whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-[10px] text-hud-gold-bright ring-1 ring-hud-gold/50 sm:text-sm">
          {"Гоблін: Спритність 7 + 2 < СЛ 15 · провал"}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-3">
          <p aria-hidden className="ld-log hud-sc text-[10px] text-hud-bone sm:text-sm">
            <span className="text-hud-gold">Ельдрін</span> · Вогняна куля → Гоблін впав, Орк −12
          </p>
          <span className="hidden rounded border border-hud-line bg-hud-field/90 px-2 py-0.5 text-xs text-hud-bone sm:inline">♫ Битва в гробниці</span>
        </div>
      </div>
    </div>
  );
}

function PlayerPhone() {
  return (
    <div className="w-[118px] rounded-[1.4rem] border-2 border-[#3a2e22] bg-[#0b0908] p-1.5 shadow-[0_30px_60px_-10px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.25)] sm:w-[170px] sm:p-2">
      <div className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-[#2a2218]" />
      <div className="space-y-1.5 rounded-2xl bg-gradient-to-b from-[#1a140f] to-[#110e0b] p-2">
        <div className="flex items-center gap-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2d4560] text-white ring-2 ring-[#ffe08a] sm:size-9">
            <Glyph icon="wizard" className="size-4 sm:size-6" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="hud-sc truncate text-[11px] text-hud-ink sm:text-sm">Ельдрін</p>
            <p className="truncate text-[9px] text-[#b3a893] sm:text-[11px]">Чарівник · 5 рів.</p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
          <div className="h-full w-[85%] bg-gradient-to-r from-[#7fa86a] to-[#a8d48f]" />
        </div>
        <p className="text-[9px] text-[#b3a893] sm:text-[11px]">Слоти 3 кола: ●●○</p>
        <div className="space-y-1">
          {SPELLS.map((s) => (
            <span
              key={s.name}
              className={cn(
                "relative flex items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 text-[9px] sm:text-xs",
                s.hot ? "ld-tap border-[#ff9a4d] bg-[#3a1a0c] text-[#ffd9b0]" : "border-hud-line bg-black/30 text-hud-bone",
              )}
            >
              {s.hot && <span aria-hidden className="ld-ripple absolute left-1/2 top-1/2 -ml-3 -mt-3 size-6 rounded-full bg-[#ffb347]/60" />}
              <span className="relative">{s.name}</span>
              <span className="relative text-[#b3a893]">{s.level}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SessionDemo() {
  return (
    <figure className="ld-demo mx-auto w-full max-w-5xl">
      <div className="relative">
        <DmScreen />
        <div className="absolute -bottom-6 -left-1 sm:-bottom-10 sm:-left-8 lg:-left-16">
          <PlayerPhone />
        </div>
      </div>
      <figcaption className="mx-auto mt-16 max-w-3xl sm:mt-20">
        <span className="sr-only">Як проходить хід: </span>
        <ol className="relative grid grid-cols-4 gap-2">
          <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-4 h-px bg-hud-rule">
            <span className="ld-progress block h-full bg-gradient-to-r from-[#c9b37a] to-[#ffe08a]" />
          </span>
          {DEMO_STEPS.map((step, i) => (
            <li key={step} className={cn(`ld-step-${i + 1}`, "relative flex flex-col items-center gap-2 text-center text-[#b3a893]")}>
              <span className="hud-sc grid size-8 place-items-center rounded-full border border-current bg-[#0b0908] text-sm">{i + 1}</span>
              <span className="text-xs leading-snug sm:text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
