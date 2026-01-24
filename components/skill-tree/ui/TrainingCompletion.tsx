"use client";

import { Button } from "@/components/ui/button";

interface TrainingCompletionProps {
  unlockedSkillsCount: number;
  maxSkills: number;
  onComplete: () => void;
}

export function TrainingCompletion({
  unlockedSkillsCount,
  onComplete,
}: TrainingCompletionProps) {
  return (
    <div className="flex justify-end">
      <Button onClick={onComplete} disabled={unlockedSkillsCount === 0}>
        Завершити навчання
      </Button>
    </div>
  );
}
