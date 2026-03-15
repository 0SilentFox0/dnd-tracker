"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface ReferenceGroupSectionProps {
  title: string;
  icon?: string | null;
  accentColor?: string | null;
  count?: number;
  children: React.ReactNode;
  className?: string;
}

export function ReferenceGroupSection({
  title,
  icon,
  accentColor,
  count,
  children,
  className,
}: ReferenceGroupSectionProps) {
  const hasAccent = accentColor && /^#?[0-9A-Fa-f]{3,8}$/.test(accentColor);

  const bgStyle = hasAccent
    ? { backgroundColor: `${accentColor}18`, borderLeftColor: accentColor }
    : undefined;

  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 overflow-hidden",
        "bg-card/80 backdrop-blur-sm",
        hasAccent && "border-l-4",
        className
      )}
      style={bgStyle}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-muted/30 min-h-[52px]">
        {icon ? (
          <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-muted">
            <Image
              src={icon}
              alt=""
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
        ) : null}
        <h2 className="font-semibold text-base truncate flex-1">{title}</h2>
        {count != null && (
          <span className="text-muted-foreground text-sm tabular-nums">
            {count}
          </span>
        )}
      </header>
      <div className="p-3 sm:p-4">
        {children}
      </div>
    </section>
  );
}
