import { MediaFrame, Screen } from "@/components/landing/MediaFrame";
import { listOf } from "@/components/landing/messages";
import { CheckList, SectionTitle } from "@/components/landing/parts";
import type { Translator } from "@/lib/i18n/translator";

export function Players({ t }: { t: Translator }) {
  const p = (id: "phone" | "hero", key: string) => t(`players.panels.${id}.${key}`);

  return (
    <section id="players" className="ld-lazy scroll-mt-20 px-4 py-20">
      <SectionTitle eyebrow={t("players.eyebrow")} title={t("players.title")} text={t("players.text")} />
      <div className="mx-auto mt-12 grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
        <article className="landing-reveal flex flex-col items-center gap-6 sm:flex-row">
          <div className="w-44 shrink-0 rounded-[1.6rem] border-2 border-[#3a2e22] bg-[#0b0908] p-2 shadow-[0_30px_60px_-10px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.25)]">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#2a2218]" />
            <Screen id="phone" alt={p("phone", "alt")} sizes="176px" className="overflow-hidden rounded-xl" />
          </div>
          <div className="space-y-3">
            <p className="hud-sc text-xs tracking-[0.2em] text-hud-gold">{p("phone", "eyebrow")}</p>
            <h3 className="hud-sc text-2xl text-hud-ink">{p("phone", "title")}</h3>
            <p className="text-hud-bone">{p("phone", "text")}</p>
            <CheckList items={listOf(t, "players.panels.phone.points")} />
          </div>
        </article>
        <article className="landing-reveal space-y-4">
          <MediaFrame title={p("hero", "screen")}>
            <Screen id="hero" alt={p("hero", "alt")} />
          </MediaFrame>
          <div className="space-y-3">
            <p className="hud-sc text-xs tracking-[0.2em] text-hud-gold">{p("hero", "eyebrow")}</p>
            <h3 className="hud-sc text-2xl text-hud-ink">{p("hero", "title")}</h3>
            <p className="text-hud-bone">{p("hero", "text")}</p>
            <CheckList items={listOf(t, "players.panels.hero.points")} />
          </div>
        </article>
      </div>
    </section>
  );
}
