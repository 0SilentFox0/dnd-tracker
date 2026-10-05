import { LoadingState } from "@/components/common/states";

export default function CharacterLoading() {
  return (
    <div className="container mx-auto p-4">
      <LoadingState rows={4} label="Завантаження персонажа…" />
    </div>
  );
}
