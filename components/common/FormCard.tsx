/**
 * Універсальний компонент для форм у Card
 */

import { ReactNode } from "react";

import { ActionBar } from "./ActionBar";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FormCardProps {
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormCard({
  title,
  description,
  onSubmit,
  onCancel,
  cancelLabel = "Скасувати",
  submitLabel = "Зберегти зміни",
  isSubmitting = false,
  submitDisabled = false,
  children,
  className,
}: FormCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
          <ActionBar>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting ? "Збереження..." : submitLabel}
            </Button>
          </ActionBar>
        </form>
      </CardContent>
    </Card>
  );
}
