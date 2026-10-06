import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="hud-sc mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">{title}</h2>
      {children}
    </section>
  );
}
