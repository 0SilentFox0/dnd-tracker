import type { ReactNode } from "react";

import { HudPage, HudPanel } from "@/components/hud/page";

interface AuthCardProps {
  title: string;
  description?: string;
  error?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, error, children, footer }: AuthCardProps) {
  return (
    <HudPage width="md" className="flex min-h-[80vh] items-center justify-center">
      <HudPanel className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <h1 className="hud-sc text-2xl text-hud-ink">{title}</h1>
          {description && <p className="text-sm text-hud-muted">{description}</p>}
        </div>
        {error && (
          <div role="alert" className="rounded-md border border-hud-danger bg-[rgba(208,112,92,.1)] p-3 text-sm text-hud-danger">
            Помилка: {error}
          </div>
        )}
        {children}
        {footer}
      </HudPanel>
    </HudPage>
  );
}
