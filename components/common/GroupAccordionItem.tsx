"use client";

import type { ComponentType, ReactNode } from "react";

import { ActionsMenu, type ActionsMenuItem } from "@/components/common/ActionsMenu";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface GroupAccordionItemProps {
  value: string;
  title: string;
  countLabel: string;
  accent?: string;
  className?: string;
  icon?: ComponentType<{ className?: string }>;
  menuActions?: ActionsMenuItem[];
  children: ReactNode;
}

export function GroupAccordionItem({
  value,
  title,
  countLabel,
  accent,
  className,
  icon: Icon,
  menuActions,
  children,
}: GroupAccordionItemProps) {
  return (
    <AccordionItem
      value={value}
      className={cn(className, accent && "border-l-[3px]")}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      <div className="relative">
        <AccordionTrigger className="px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
            {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-hud-gold" />}
            <div className="flex-1 min-w-0">
              <h3 className="hud-sc truncate text-lg text-hud-ink">{title}</h3>
              <p className="mt-1 text-sm text-hud-muted">{countLabel}</p>
            </div>
          </div>
        </AccordionTrigger>
        {menuActions && (
          <div
            className="absolute right-12 sm:right-14 top-1/2 -translate-y-1/2 z-10"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ActionsMenu
              actions={menuActions}
              triggerClassName="h-10 w-10 sm:h-12 sm:w-12"
              iconClassName="h-5 w-5 sm:h-6 sm:w-6"
              stopPropagation
            />
          </div>
        )}
      </div>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
