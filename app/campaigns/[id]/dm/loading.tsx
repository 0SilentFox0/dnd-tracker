import { LoadingState } from "@/components/common/states";

export default function DmSectionLoading() {
  return (
    <div className="container mx-auto p-4">
      <LoadingState rows={6} label="Завантаження…" />
    </div>
  );
}
