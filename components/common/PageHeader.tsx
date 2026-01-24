/**
 * Універсальний компонент для заголовків сторінок
 */

import { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageHeaderProps {
  title: string;
  description?: string;
  stats?: string | number | ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  stats,
  actions,
  children,
  className,
}: PageHeaderProps) {
  // Формуємо опис зі статистикою
  const descriptionText = description
    ? `${description}${
        stats !== undefined && typeof stats === "number"
          ? ` Всього: ${stats}`
          : stats !== undefined && typeof stats === "string"
          ? ` Всього: ${stats}`
          : ""
      }`
    : stats !== undefined && typeof stats === "number"
    ? `Всього: ${stats}`
    : undefined;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {descriptionText && <CardDescription>{descriptionText}</CardDescription>}
            {stats !== undefined && typeof stats !== "string" && typeof stats !== "number" && (
              <CardDescription>{stats}</CardDescription>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
