"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Edit, Trash2 } from "lucide-react";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard } from "@/components/hud/page";

interface DmEntityCardProps {
  href: string;
  title: string;
  accent?: string;
  onDelete: () => void;
  children: ReactNode;
}

export function DmEntityCard({ href, title, accent, onDelete, children }: DmEntityCardProps) {
  const t = useTranslations("common.actions");

  return (
    <HudCard accent={accent} className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-lg text-hud-ink">{title}</h3>
        </Link>
        <ActionsMenu
          triggerSize="sm"
          triggerClassName="h-8 w-8 p-0"
          actions={[
            { label: t("edit"), icon: Edit, href },
            { label: t("delete"), icon: Trash2, onSelect: onDelete, destructive: true },
          ]}
        />
      </div>
      <Link href={href} className="flex flex-wrap gap-2">
        {children}
      </Link>
    </HudCard>
  );
}
