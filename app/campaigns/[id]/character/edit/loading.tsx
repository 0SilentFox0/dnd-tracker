import { LoadingState } from "@/components/common/states";

export default function CharacterEditLoading() {
  return (
    <div className="container mx-auto p-4">
      <LoadingState rows={5} label="Завантаження форми…" />
    </div>
  );
}
