"use client";

import type { ReactNode } from "react";

import type { BattleDialogBaseProps } from "./types";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export interface BattleDialogProps extends BattleDialogBaseProps {
  /** Dialog title (renders DialogHeader when set) */
  title?: ReactNode;
  /** Dialog description (under title). Can be string or ReactNode. */
  description?: ReactNode;
  /** ClassName for DialogContent */
  contentClassName?: string;
  /** Body content */
  children: ReactNode;
}

/**
 * Wrapper for battle dialogs: Dialog + DialogContent + optional Header (title/description).
 */
export function BattleDialog({ open, onOpenChange, title, description, contentClassName, children }: BattleDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? <span className="sr-only">Дія в бою</span>}
      description={description}
      size="sm"
      className={contentClassName}
    >
      {children}
    </ResponsiveDialog>
  );
}
