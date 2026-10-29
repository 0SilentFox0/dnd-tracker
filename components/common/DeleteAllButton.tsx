"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

interface DeleteAllButtonProps {
  count: number;
  noun: string;
  confirm: { description: string; title?: string; label?: string };
  actions: { onConfirm: () => Promise<unknown> };
  view?: { variant?: "solid" | "soft"; icon?: ReactNode };
  status?: { isPending?: boolean };
}

const SOFT = "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30";

export function DeleteAllButton({ count, noun, confirm: texts, actions, view, status }: DeleteAllButtonProps) {
  const t = useTranslations("common.deleteAll");

  const confirm = useConfirm();

  const { description, label = t("label"), title } = texts;

  const { variant = "solid", icon } = view ?? {};

  if (count === 0) return null;

  const heading = title ?? t("title", { noun });

  const ask = () => confirm({ title: heading, description, confirmLabel: label, destructive: true, onConfirm: actions.onConfirm });

  return (
    <Button
      type="button"
      variant={variant === "solid" ? "destructive" : "outline"}
      className={cn("whitespace-nowrap text-xs sm:text-sm", variant === "soft" && SOFT)}
      disabled={status?.isPending}
      onClick={() => void ask()}
    >
      {icon}
      {label}
    </Button>
  );
}
