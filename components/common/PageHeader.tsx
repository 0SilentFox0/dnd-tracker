import { ReactNode } from "react";

import { HudPageHeader } from "@/components/hud/page";

interface PageHeaderProps {
  title: string;
  description?: string;
  stats?: string | number | ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, stats, actions, children, className }: PageHeaderProps) {
  const isScalarStats = typeof stats === "number" || typeof stats === "string";

  const totalText = isScalarStats ? `Всього: ${stats}` : undefined;

  const descriptionText = description ? `${description}${totalText ? ` ${totalText}` : ""}` : totalText;

  const hasNodeStats = stats !== undefined && !isScalarStats;

  const subtitle =
    descriptionText || hasNodeStats ? (
      <>
        {descriptionText}
        {hasNodeStats && <span className="block">{stats}</span>}
      </>
    ) : undefined;

  return (
    <HudPageHeader title={title} subtitle={subtitle} actions={actions} className={className}>
      {children}
    </HudPageHeader>
  );
}
