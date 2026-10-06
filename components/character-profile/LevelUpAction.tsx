import { Button } from "@/components/ui/button";

export function LevelUpAction({ level, maxLevel, onLevelUp }: { level: number; maxLevel: number; onLevelUp: () => void }) {
  if (level >= maxLevel) return null;

  return (
    <Button type="button" size="sm" variant="outline" onClick={onLevelUp}>
      + рівень
    </Button>
  );
}
