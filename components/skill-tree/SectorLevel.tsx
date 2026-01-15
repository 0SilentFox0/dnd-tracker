import type { MainSkill } from "@/lib/types/skill-tree";
import { darkenColor } from "./utils";

interface SectorLevelProps {
  mainSkills: MainSkill[];
  sectorAngle: number;
  radiusPercent: number;
  levelName: "expert" | "advanced" | "basic";
  darkenPercent: number;
}

export function SectorLevel({
  mainSkills,
  sectorAngle,
  radiusPercent,
  levelName,
  darkenPercent,
}: SectorLevelProps) {
  const skewY = -60 + 360 / mainSkills.length;

  return (
    <div
      className="circle circle_color absolute opacity-40 overflow-hidden"
      style={{
        height: `${radiusPercent * 2}%`,
        width: `${radiusPercent * 2}%`,
        left: `${50 - radiusPercent}%`,
        top: `${50 - radiusPercent}%`,
        borderRadius: "50%",
      }}
    >
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          height: "100%",
          width: "100%",
          position: "relative",
        }}
      >
        {mainSkills.map((mainSkill, index) => {
          const startAngle = index * sectorAngle - Math.PI / 2;
          const color = darkenColor(mainSkill.color, darkenPercent);

          return (
            <li
              key={`${levelName}-${mainSkill.id}`}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "50%",
                height: "50%",
                transformOrigin: "0 100%",
                transform: `rotate(${
                  (startAngle * 180) / Math.PI
                }deg) skewY(${skewY}deg)`,
                borderLeft: "2px solid rgba(255,255,255,0.3)",
                overflow: "hidden",
                backgroundColor: `${color}CC`,
                boxShadow: `0 0 90px ${color}`,
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}
