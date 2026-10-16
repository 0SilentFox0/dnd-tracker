import { spellSchoolColor } from "@/lib/constants/spells";
import { ALL_SCHOOLS } from "@/lib/hooks/spells";
import { cn } from "@/lib/utils";

export function SchoolTabs({ schools, active, countOf, onPick }: { schools: string[]; active: string; countOf: (name: string) => number; onPick: (name: string) => void }) {
  const tabs = [{ name: ALL_SCHOOLS, label: "Усі", color: "#2a2018" }, ...schools.map((name) => ({ name, label: name, color: spellSchoolColor(name) }))];

  return (
    <div role="group" aria-label="Школи магії" className="sticky top-0 z-10 -mx-5 -mt-4 mb-2 flex flex-wrap items-start gap-1.5 bg-[#e9dec5] px-5 pb-1">
      {tabs.map((t) => {
        const count = t.name === ALL_SCHOOLS ? undefined : countOf(t.name);

        return (
          <button
            key={t.name}
            type="button"
            aria-pressed={active === t.name}
            onClick={() => onPick(t.name)}
            style={{ backgroundColor: t.color }}
            className={cn(
              "hud-sc flex items-start justify-center px-3 pt-1 text-[13px] font-bold text-white [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)] [text-shadow:0_1px_2px_rgba(0,0,0,.6)]",
              active === t.name ? "h-11" : "h-8 hover:h-9",
              count === 0 && "opacity-40",
            )}
          >
            {t.label}{count !== undefined && <span className="ml-1 font-sans text-[11px] opacity-85">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
