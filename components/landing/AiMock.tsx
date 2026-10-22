import { Check, Sparkles, X } from "lucide-react";

export function AiMock() {
  return (
    <div className="grid aspect-[16/10] grid-cols-[1fr_1.15fr] text-left">
      <div className="space-y-2 overflow-hidden border-r border-hud-rule p-3 text-[11px] leading-relaxed text-hud-bone sm:text-xs">
        <p className="hud-sc text-sm text-hud-ink">1.2 Пастка в Брезгирі</p>
        <p>Село живе своїм вечором, і на перший погляд у ньому все гаразд.</p>
        <p className="rounded border-l-2 border-[#8a5cc9] bg-[#8a5cc9]/10 px-2 py-1">
          <span className="text-[#c9a8f0]">Нова сцена: </span>
          Староста Мирослав ховає в погребі пораненого біса — і просить героїв мовчати.
        </p>
        <p className="text-[#8f8473]">Хто пройшов перевірку, може попередити людей…</p>
      </div>
      <div className="flex flex-col gap-2 bg-[#120e0b] p-3 text-[11px] sm:text-xs">
        <p className="flex items-center gap-1.5 text-hud-gold">
          <Sparkles aria-hidden className="size-3.5" />
          <span className="hud-sc">AI-співавтор</span>
        </p>
        <p className="ml-auto max-w-[85%] rounded-lg bg-[#2a2218] px-2 py-1.5 text-hud-ink">Додай у Брезгир моральний вибір для Семгруна</p>
        <p className="max-w-[90%] rounded-lg bg-black/40 px-2 py-1.5 text-hud-bone">
          Пропоную сцену зі старостою: він ховає біса, бо той урятував його доньку. Семгрун мусить обрати — правда чи довіра села.
        </p>
        <div className="mt-auto rounded-lg border border-[#8a5cc9]/60 bg-[#8a5cc9]/10 p-2">
          <p className="mb-1.5 text-[#c9a8f0]">Пропозиція · +1 сцена у «1.2»</p>
          <div className="flex gap-1.5">
            <span className="metal-gold metal-fill flex items-center gap-1 rounded px-2 py-0.5">
              <Check aria-hidden className="size-3" />
              Прийняти
            </span>
            <span className="flex items-center gap-1 rounded border border-hud-line px-2 py-0.5 text-hud-bone">
              <X aria-hidden className="size-3" />
              Відхилити
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
