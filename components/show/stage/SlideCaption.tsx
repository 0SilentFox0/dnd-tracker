import type { Slide } from "@/types/show";

export function SlideCaption({ slide }: { slide: Slide }) {
  if (!slide.title && !slide.caption) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-6 pb-8 pt-16 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
      {slide.title && <h2 className="hud-sc text-2xl tracking-[.08em] text-hud-gold-bright md:text-4xl">{slide.title}</h2>}
      {slide.caption && <p className="mx-auto mt-2 max-w-3xl text-base text-hud-bone md:text-xl">{slide.caption}</p>}
    </div>
  );
}
