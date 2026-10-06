"use client";

import Image from "next/image";

import { isValidImageSrc } from "@/components/campaigns/info/image-url";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ReferenceGroupSectionProps {
  title: string;
  icon?: string | null;
  accentColor?: string | null;
  count?: number;
  children: React.ReactNode;
  className?: string;
  accordionValue?: string;
}

function GroupHeader({
  title,
  icon,
  count,
  className,
}: {
  title: string;
  icon?: string | null;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-3 text-left", className)}>
      {isValidImageSrc(icon) ? (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[#4a3c2c] bg-[#1a140f]">
          <Image src={icon} alt="" fill className="object-cover" sizes="32px" />
        </div>
      ) : null}
      <span className="hud-sc flex-1 truncate text-base">{title}</span>
      {count != null && (
        <span className="shrink-0 text-sm tabular-nums text-[#8f8473]">
          {count}
        </span>
      )}
    </div>
  );
}

export function ReferenceGroupSection({
  title,
  icon,
  accentColor,
  count,
  children,
  className,
  accordionValue,
}: ReferenceGroupSectionProps) {
  const accent =
    accentColor && /^#?[0-9A-Fa-f]{3,8}$/.test(accentColor)
      ? accentColor
      : undefined;

  const frameClass = cn(
    "overflow-hidden rounded-xl border",
    accent && "border-l-[3px]",
    className,
  );

  const accentStyle = accent ? { borderLeftColor: accent } : undefined;

  if (accordionValue != null) {
    return (
      <AccordionItem
        value={accordionValue}
        className={cn(frameClass, "last:border-b")}
        style={accentStyle}
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:border-b data-[state=open]:border-[#4a3c2c]">
          <GroupHeader title={title} icon={icon} count={count} />
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <div className="p-3 sm:p-4">{children}</div>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <section
      className={cn(frameClass, "border-[#4a3c2c] bg-[rgba(20,16,12,.85)]")}
      style={accentStyle}
    >
      <header>
        <GroupHeader
          title={title}
          icon={icon}
          count={count}
          className="border-b border-[#4a3c2c] px-4 py-3 text-[#c9b37a]"
        />
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}
