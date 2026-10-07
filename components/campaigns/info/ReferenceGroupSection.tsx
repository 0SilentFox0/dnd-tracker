"use client";


import { EntityIcon } from "@/components/common/EntityIcon";
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
      {icon && <EntityIcon src={icon} name={title} size={32} className="size-8 rounded-lg border border-hud-line bg-hud-field" />}
      <span className="hud-sc flex-1 truncate text-base">{title}</span>
      {count != null && (
        <span className="shrink-0 text-sm tabular-nums text-hud-muted">
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
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:border-b data-[state=open]:border-hud-line">
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
      className={cn(frameClass, "border-hud-line bg-[rgba(20,16,12,.85)]")}
      style={accentStyle}
    >
      <header>
        <GroupHeader
          title={title}
          icon={icon}
          count={count}
          className="border-b border-hud-line px-4 py-3 text-hud-gold"
        />
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}
