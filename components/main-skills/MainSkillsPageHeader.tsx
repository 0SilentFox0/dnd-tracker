"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

interface MainSkillsPageHeaderProps {
  mainSkillsCount: number;
  onCreateClick: () => void;
}

export function MainSkillsPageHeader({
  mainSkillsCount,
  onCreateClick,
}: MainSkillsPageHeaderProps) {
  return (
    <PageHeader
      title="Основні Навики"
      description="Управління основними навиками для дерев прокачки"
      stats={mainSkillsCount}
      actions={<Button onClick={onCreateClick}>Створити основний навик</Button>}
    />
  );
}
