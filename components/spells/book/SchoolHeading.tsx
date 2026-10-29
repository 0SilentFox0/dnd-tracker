import { useTranslations } from "next-intl";

import { spellSchoolColor } from "@/lib/constants/spells";
import { NO_SCHOOL } from "@/lib/utils/spells/group-by-school";

export function SchoolHeading({ school }: { school: { name: string; color?: string | null } }) {
  const t = useTranslations("spells.book");

  const color = spellSchoolColor(school);

  return (
    <div className="hud-sc flex items-center gap-2 text-sm font-bold tracking-[.06em]" style={{ color }}>
      <span className="size-2.5 rotate-45" style={{ backgroundColor: color }} />
      {school.name === NO_SCHOOL ? t("noSchool") : school.name}
      <span className="h-px flex-1 opacity-40" style={{ backgroundColor: color }} />
    </div>
  );
}
