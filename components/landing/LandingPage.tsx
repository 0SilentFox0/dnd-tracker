import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, Hammer } from "lucide-react";

import "@/components/hud/hud.css";
import "@/components/landing/landing.css";
import { HUD_SURFACE } from "@/components/hud";
import { AiMock } from "@/components/landing/AiMock";
import { CONSTRUCTOR, FAQ, type Feature, FEATURES, ROLES, type Showcase, SHOWCASES, STEPS } from "@/components/landing/content";
import { LandingHero, PrimaryCta } from "@/components/landing/LandingHero";
import { MagicSection, PainSection, StatsBand } from "@/components/landing/LandingSections";
import { SessionSwitch } from "@/components/landing/SessionSwitch";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#features", label: "Можливості" },
  { href: "#constructor", label: "Конструктор" },
  { href: "#faq", label: "Питання" },
];

function Brand() {
  return (
    <Link prefetch={false} href="/" className="hud-sc flex items-center gap-2 text-lg text-hud-ink">
      <span aria-hidden className="metal-gold metal-fill grid size-8 place-items-center rounded-md text-sm font-bold">
        d20
      </span>
      Combat Tracker
    </Link>
  );
}

function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hud-rule/60 bg-[#0b0908]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <nav aria-label="Розділи" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="hud-sc text-sm text-hud-bone transition hover:text-hud-gold-strong">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SessionSwitch
            member={
            <Link prefetch={false} href="/campaigns" className="hud-sc metal-gold metal-fill rounded-md px-4 py-2 text-sm">
              Мої кампанії
            </Link>
            }
            guest={
            <>
              <Link prefetch={false} href="/sign-in" className="hud-sc rounded-md px-3 py-2 text-sm text-hud-bone hover:text-hud-gold-strong">
                Увійти
              </Link>
              <Link prefetch={false} href="/sign-up" className="hud-sc metal-gold metal-fill rounded-md px-4 py-2 text-sm">
                Реєстрація
              </Link>
            </>
            }
          />
        </div>
      </div>
    </header>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{eyebrow}</p>
      <h2 className="hud-sc text-3xl text-hud-ink sm:text-4xl">{title}</h2>
      {text && <p className="text-lg text-hud-bone">{text}</p>}
      <div aria-hidden className="mx-auto flex max-w-xs items-center gap-3 pt-2">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-hud-gold/60" />
        <span className="size-2 rotate-45 border border-hud-gold" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-hud-gold/60" />
      </div>
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p} className="flex gap-2 text-hud-bone">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-hud-gold-strong" />
          {p}
        </li>
      ))}
    </ul>
  );
}

function ShowcaseMedia({ item }: { item: Showcase }) {
  return (
    <div className="overflow-hidden rounded-xl border border-hud-line bg-[#0e0b09] shadow-[0_30px_70px_-20px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.15)] transition duration-500 hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.4),0_0_60px_-20px_rgba(230,194,90,.35)]">
      <div className="flex items-center gap-2 border-b border-hud-rule bg-[#15110d] px-3 py-1.5">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-[#5a3a2a]" />
          <span className="size-2 rounded-full bg-[#5a4a2a]" />
          <span className="size-2 rounded-full bg-[#3a4a2a]" />
        </span>
        <span className="hud-sc truncate text-xs text-hud-bone">{item.screen}</span>
      </div>
      {item.mock === "ai" ? (
        <div role="img" aria-label={item.alt}>
          <AiMock />
        </div>
      ) : (
        <div className="relative aspect-[16/10]">
          <Image src={item.image} alt={item.alt} fill sizes="(min-width: 1152px) 550px, (min-width: 1024px) 45vw, 100vw" className="object-cover object-top" />
        </div>
      )}
    </div>
  );
}

function ShowcaseRow({ item, flipped }: { item: Showcase; flipped: boolean }) {
  return (
    <article className="landing-reveal grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={cn(flipped && "lg:order-2")}>
        <ShowcaseMedia item={item} />
      </div>
      <div className="space-y-4">
        <p className="hud-sc text-sm tracking-[0.2em] text-hud-gold">{item.eyebrow}</p>
        <h3 className="hud-sc text-2xl text-hud-ink sm:text-3xl">{item.title}</h3>
        <p className="text-lg text-hud-bone">{item.text}</p>
        <CheckList items={item.points} />
      </div>
    </article>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <div className="landing-reveal group rounded-xl border border-hud-rule bg-hud-panel p-5 transition hover:-translate-y-0.5 hover:border-hud-gold/60">
      <Icon aria-hidden className="mb-3 size-6 text-hud-gold transition group-hover:text-hud-gold-bright" />
      <h3 className="hud-sc mb-1 text-lg text-hud-ink">{feature.title}</h3>
      <p className="text-sm text-[#b3a893]">{feature.text}</p>
    </div>
  );
}

function BackdropImage({ src, opacity }: { src: string; opacity: string }) {
  return <Image src={src} alt="" fill sizes="100vw" quality={60} className={cn("-z-10 object-cover", opacity)} />;
}

export function LandingPage() {
  return (
    <div data-landing className={cn(HUD_SURFACE, "min-h-screen bg-[#0b0908]")}>
      <LandingNav />
      <main>
        <LandingHero />

        <StatsBand />

        <PainSection />

        <section id="features" className="ld-lazy scroll-mt-20 px-4 py-20">
          <SectionTitle eyebrow="Можливості" title="Усе для гри — без паперу й таблиць" text="Від першого кидка ініціативи до фінальної сцени кампанії." />
          <div className="mx-auto mt-12 max-w-6xl space-y-20">
            {SHOWCASES.map((item, i) => (
              <ShowcaseRow key={item.id} item={item} flipped={i % 2 === 1} />
            ))}
          </div>
          <div className="mx-auto mt-20 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </section>

        <MagicSection />

        <section id="constructor" className="ld-lazy relative isolate scroll-mt-20 overflow-hidden border-y border-hud-rule px-4 py-20">
          <BackdropImage src="/landing/constructor.webp" opacity="opacity-20" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0908] via-[#0b0908]/70 to-[#0b0908]" />
          <p className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-hud-gold/50 bg-black/60 px-3 py-1 text-xs text-hud-gold">
            <Hammer aria-hidden className="size-3.5" />
            Незабаром
          </p>
          <SectionTitle
            eyebrow="Конструктор кампаній"
            title="Власна кампанія або готовий шаблон"
            text="Шаблони під популярні редакції D&D, власні правила, відкрите API та повні механіки 5e — будь-який світ без жодного рядка коду."
          />
          <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONSTRUCTOR.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </section>

        <section id="roles" className="ld-lazy scroll-mt-20 px-4 py-20">
          <SectionTitle eyebrow="Для кого" title="Один стіл — дві сторони екрана" />
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {ROLES.map(({ icon: Icon, title, points }) => (
              <div key={title} className="landing-reveal rounded-xl border border-hud-line bg-gradient-to-b from-[#1a140f] to-[#110e0b] p-6 shadow-[inset_0_1px_0_rgba(230,194,90,.15)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="metal-gold metal-fill grid size-10 place-items-center rounded-lg">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="hud-sc text-2xl text-hud-ink">{title}</h3>
                </div>
                <CheckList items={points} />
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="ld-lazy scroll-mt-20 border-t border-hud-rule px-4 py-20">
          <SectionTitle eyebrow="Питання" title="Часті запитання" />
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="landing-reveal group rounded-xl border border-hud-rule bg-hud-panel open:border-hud-gold/50">
                <summary className="hud-sc flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-lg text-hud-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-hud-gold transition group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-hud-bone">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="ld-lazy relative isolate overflow-hidden px-4 py-24">
          <BackdropImage src="/landing/candle.webp" opacity="opacity-40" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,9,8,.35),#0b0908_75%)]" />
          <SectionTitle eyebrow="Як почати" title="Три кроки до першого бою" />
          <ol className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="landing-reveal text-center">
                <span className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-hud-gold/60 bg-black/60 text-hud-gold">
                  <Icon aria-hidden className="size-6" />
                </span>
                <p className="hud-sc text-lg text-hud-ink">
                  {i + 1}. {title}
                </p>
                <p className="text-sm text-hud-bone">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex justify-center">
            <PrimaryCta />
          </div>
        </section>
      </main>

      <footer className="border-t border-hud-rule px-4 py-8 text-sm text-[#b3a893]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Brand />
          <p>Помічник ДМ для D&D 5e · {new Date().getFullYear()}</p>
          <nav aria-label="Акаунт" className="flex gap-4">
            <Link prefetch={false} href="/sign-in" className="hover:text-hud-gold-strong">
              Вхід
            </Link>
            <Link prefetch={false} href="/sign-up" className="hover:text-hud-gold-strong">
              Реєстрація
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-center text-xs sm:text-left">
          Фото —{" "}
          <a href="https://unsplash.com" className="underline hover:text-hud-gold-strong" rel="noopener noreferrer" target="_blank">
            Unsplash
          </a>
          . Силуети токенів —{" "}
          <a href="https://game-icons.net" className="underline hover:text-hud-gold-strong" rel="noopener noreferrer" target="_blank">
            game-icons.net
          </a>{" "}
          (Delapouite, Lorc), CC BY 3.0. Dungeons & Dragons — торгова марка Wizards of the Coast; проєкт не пов&apos;язаний з нею.
        </p>
      </footer>
    </div>
  );
}
