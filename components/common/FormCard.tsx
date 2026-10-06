import { ReactNode } from "react";

import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";

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
    <HudFormPage title={title} aside={description} className={className}>
      <HudForm
        id="form-card"
        onSubmit={onSubmit}
        actions={
          <>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting ? "Збереження..." : submitLabel}
            </Button>
          </>
        }
      >
        <div className="space-y-6">{children}</div>
      </HudForm>
    </HudFormPage>
  );
}
