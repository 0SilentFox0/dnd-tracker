"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { pluralUk } from "@/lib/utils/plural";

interface DeleteAllButtonProps {
  count: number;
  nouns: [string, string, string];
  description: string;
  onConfirm: () => Promise<unknown>;
  label?: string;
  title?: string;
  variant?: "solid" | "soft";
  icon?: ReactNode;
  pending?: boolean;
}

const SOFT = "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30";

export function DeleteAllButton({ count, nouns, description, onConfirm, label = "Видалити всі", title, variant = "solid", icon, pending }: DeleteAllButtonProps) {
  const confirm = useConfirm();

  if (count === 0) return null;

  const heading = title ?? `Видалити всі ${pluralUk(2, nouns)}?`;

  const ask = () => confirm({ title: heading, description, confirmLabel: label, destructive: true, onConfirm });

  return (
    <Button
      type="button"
      variant={variant === "solid" ? "destructive" : "outline"}
      className={cn("whitespace-nowrap text-xs sm:text-sm", variant === "soft" && SOFT)}
      disabled={pending}
      onClick={() => void ask()}
    >
      {icon}
      {label}
    </Button>
  );
}
