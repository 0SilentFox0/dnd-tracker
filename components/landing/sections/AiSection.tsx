import { ShieldCheck } from "lucide-react";

import { AiMock } from "@/components/landing/AiMock";
import { MediaFrame } from "@/components/landing/MediaFrame";
import { listOf } from "@/components/landing/messages";
import { CheckList } from "@/components/landing/parts";
import type { Translator } from "@/lib/i18n/translator";

export function AiSection({ t }: { t: Translator }) {
  return (
    <section id="ai" className="ld-lazy relative isolate scroll-mt-20 overflow-hidden border-y border-hud-rule px-4 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_40%,rgba(138,92,201,.16),transparent_60%),#0b0908]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <MediaFrame title={t("ai.screen")} className="landing-reveal">
          <div role="img" aria-label={t("ai.alt")}>
            <AiMock t={t} />
          </div>
        </MediaFrame>
        <div className="space-y-5">
          <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{t("ai.eyebrow")}</p>
          <h2 className="hud-sc text-3xl text-hud-ink sm:text-4xl">{t("ai.title")}</h2>
          <p className="text-lg text-hud-bone">{t("ai.text")}</p>
          <CheckList items={listOf(t, "ai.points")} />
          <p className="flex gap-3 rounded-lg border border-[#8a5cc9]/50 bg-[#8a5cc9]/10 p-4 text-sm text-hud-bone">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-[#c9a8f0]" />
            {t("ai.honesty")}
          </p>
        </div>
      </div>
    </section>
  );
}
