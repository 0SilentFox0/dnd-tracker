import { spellSchoolColor } from "@/lib/constants/spells";

export function SchoolHeading({ school }: { school: { name: string; color?: string | null } }) {
  const color = spellSchoolColor(school);

  return (
    <div className="hud-sc flex items-center gap-2 text-sm font-bold tracking-[.06em]" style={{ color }}>
      <span className="size-2.5 rotate-45" style={{ backgroundColor: color }} />
      {school.name}
      <span className="h-px flex-1 opacity-40" style={{ backgroundColor: color }} />
    </div>
  );
}
