import { Button } from "@/components/ui/button";

export function NewBranchRow({ count, onSelect }: { count: number; onSelect: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onSelect} className="h-auto whitespace-normal rounded-none p-0 font-normal hover:bg-transparent dark:hover:bg-transparent flex w-full items-center justify-start gap-3 px-4 py-2 text-left">
      <span className="branch-frame new hud-sc text-2xl">?</span>
      <span className="text-sm italic text-[#b8ab95]">Нова гілка — одна з {count} доступних</span>
    </Button>
  );
}
