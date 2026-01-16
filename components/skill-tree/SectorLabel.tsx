import { getPositionPercent, SKILL_TREE_CONSTANTS } from "./utils";

interface SectorLabelProps {
  name: string;
  midAngle: number;
}

export function SectorLabel({ name, midAngle }: SectorLabelProps) {
  const { innerRadiusPercent, outerRadiusPercent } = SKILL_TREE_CONSTANTS;

  return (
    <div
      className="absolute pointer-events-none text-white text-[10px] sm:text-xs font-bold whitespace-nowrap"
      style={{
        ...getPositionPercent(
          midAngle,
          (innerRadiusPercent + outerRadiusPercent) / 2
        ),
        transform: "translate(-50%, -50%)",
        textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
        zIndex: 9,
      }}
    >
      {name}
    </div>
  );
}
