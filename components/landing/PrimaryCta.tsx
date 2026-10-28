import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SessionSwitch } from "@/components/landing/SessionSwitch";

const CTA_CLASS =
  "hud-sc metal-gold metal-fill inline-flex h-12 items-center gap-2 rounded-lg px-7 text-base shadow-[0_8px_30px_-8px_rgba(230,194,90,.6)] transition hover:brightness-110";

function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <Link prefetch={false} href={href} className={CTA_CLASS}>
      {label}
      <ChevronRight aria-hidden className="size-4" />
    </Link>
  );
}

export function PrimaryCta({ copy }: { copy: { primary: string; member: string } }) {
  return <SessionSwitch guest={<CtaLink href="/sign-up" label={copy.primary} />} member={<CtaLink href="/campaigns" label={copy.member} />} />;
}
