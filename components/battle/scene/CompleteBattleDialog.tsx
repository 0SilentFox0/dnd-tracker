"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useBattleScene } from "@/lib/hooks/battle";

export function CompleteBattleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { actions } = useBattleScene();

  const finish = async (result?: "victory" | "defeat") => {
    await actions.complete.mutateAsync(result ? { result } : {});
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Завершити бій?"
      description={<span className="text-slate-300">Оберіть результат завершення або визначте автоматично за умовами перемоги.</span>}
      size="sm"
      className="border-slate-700 bg-slate-900 text-white"
      footer={
        <>
          <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button variant="outline" disabled={actions.complete.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/20" onClick={() => void finish("defeat")}>
            Поразка
          </Button>
          <Button variant="outline" disabled={actions.complete.isPending} className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20" onClick={() => void finish()}>
            Авто
          </Button>
          <Button disabled={actions.complete.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void finish("victory")}>
            Перемога
          </Button>
        </>
      }
    />
  );
}
