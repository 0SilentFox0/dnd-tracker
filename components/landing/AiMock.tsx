import { Check, Sparkles, X } from "lucide-react";

import type { AiMockCopy } from "@/components/landing/copy/types";

export function AiMock({ copy }: { copy: AiMockCopy }) {
  return (
    <div className="grid aspect-[16/10] grid-cols-[1fr_1.15fr] text-left">
      <div className="space-y-2 overflow-hidden border-r border-hud-rule p-3 text-[11px] leading-relaxed text-hud-bone sm:text-xs">
        <p className="hud-sc text-sm text-hud-ink">{copy.pageTitle}</p>
        <p>{copy.pageText}</p>
        <p className="rounded border-l-2 border-[#8a5cc9] bg-[#8a5cc9]/10 px-2 py-1">
          <span className="text-[#c9a8f0]">{copy.newSceneLabel}</span>
          {copy.newSceneText}
        </p>
        <p className="text-[#8f8473]">{copy.pageTail}</p>
      </div>
      <div className="flex flex-col gap-2 bg-[#120e0b] p-3 text-[11px] sm:text-xs">
        <p className="flex items-center gap-1.5 text-hud-gold">
          <Sparkles aria-hidden className="size-3.5" />
          <span className="hud-sc">{copy.panelTitle}</span>
        </p>
        <p className="ml-auto max-w-[85%] rounded-lg bg-[#2a2218] px-2 py-1.5 text-hud-ink">{copy.userMessage}</p>
        <p className="max-w-[90%] rounded-lg bg-black/40 px-2 py-1.5 text-hud-bone">{copy.reply}</p>
        <div className="mt-auto rounded-lg border border-[#8a5cc9]/60 bg-[#8a5cc9]/10 p-2">
          <p className="mb-1.5 text-[#c9a8f0]">{copy.proposal}</p>
          <div className="flex gap-1.5">
            <span className="metal-gold metal-fill flex items-center gap-1 rounded px-2 py-0.5">
              <Check aria-hidden className="size-3" />
              {copy.accept}
            </span>
            <span className="flex items-center gap-1 rounded border border-hud-line px-2 py-0.5 text-hud-bone">
              <X aria-hidden className="size-3" />
              {copy.reject}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
