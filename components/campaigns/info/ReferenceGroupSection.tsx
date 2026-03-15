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
  /** Якщо задано — секція рендериться як пункт акордеону (згортається/розгортається). */
  accordionValue?: string;
}

function GroupHeader({
  title,
  icon,
  count,
  hasAccent,
  bgStyle,
  className,
}: {
  title: string;
  icon?: string | null;
  count?: number;
  hasAccent: boolean;
  bgStyle: React.CSSProperties | undefined;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 min-h-[52px] w-full text-left bg-transparent",
        hasAccent && "border-l-4",
        className,
      )}
    >
      {isValidImageSrc(icon) ? (
        <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-muted">
          <Image src={icon} alt="" fill className="object-cover" sizes="32px" />
        </div>
      ) : null}
      <span className="font-semibold text-base truncate flex-1">{title}</span>
      {count != null && (
        <span className="text-muted-foreground text-sm tabular-nums shrink-0">
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
  const hasAccent = accentColor && /^#?[0-9A-Fa-f]{3,8}$/.test(accentColor);

  const bgStyle = hasAccent
    ? { backgroundColor: `${accentColor}18`, borderLeftColor: accentColor }
    : undefined;

  const headerClass = "px-4 py-3 border-b border-border/60 bg-transparent";

  const header = (
    <GroupHeader
      title={title}
      icon={icon}
      count={count}
      hasAccent={hasAccent}
      bgStyle={bgStyle}
      className={headerClass}
    />
  );

  if (accordionValue != null) {
    return (
      <AccordionItem
        value={accordionValue}
        className={cn(
          "rounded-xl border border-border/80 overflow-hidden",
          "bg-card/80 backdrop-blur-sm",
          hasAccent && "border-l-4",
          className,
        )}
        style={bgStyle}
      >
        <AccordionTrigger className="hover:no-underline px-4 py-3 data-[state=open]:border-b data-[state=open]:border-border/60">
          <GroupHeader
            title={title}
            icon={icon}
            count={count}
            hasAccent={hasAccent}
            bgStyle={bgStyle}
            className="flex-1 border-0 bg-muted/30 min-h-0 py-0"
          />
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <div className="p-3 sm:p-4">{children}</div>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 overflow-hidden",
        "bg-card/80 backdrop-blur-sm",
        hasAccent && "border-l-4",
        className,
      )}
      style={bgStyle}
    >
      <header>{header}</header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}
