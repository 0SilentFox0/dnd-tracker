"use client";

import type { ReactNode } from "react";

import type { BattleDialogBaseProps } from "./types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DEFAULT_CONTENT_CLASS = "max-w-md max-h-[90vh] overflow-y-auto z-[100]";

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
export function BattleDialog({
  open,
  onOpenChange,
  title,
  description,
  contentClassName,
  children,
}: BattleDialogProps) {
  const hasHeader = title != null || description != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(DEFAULT_CONTENT_CLASS, contentClassName)}
      >
        {hasHeader && (
          <DialogHeader>
            {title != null && <DialogTitle>{title}</DialogTitle>}
            {description != null && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
