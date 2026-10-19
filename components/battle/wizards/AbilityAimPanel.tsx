import { MapAimPanel } from "./MapAimPanel";

/** Поки вміння наводиться на карту, вибір закритий. */
export function AbilityAimPanel({ name, onCancel }: { name: string; onCancel: () => void }) {
  return (
    <MapAimPanel
      ariaLabel="Наведення вміння"
      title={name}
      hint="Оберіть клітинку на карті"
      footer={<button type="button" onClick={onCancel} className="hud-sc h-10 w-full border border-white/20 px-3 text-sm">Скасувати</button>}
    />
  );
}
