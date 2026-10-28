"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useAssistantPolicy } from "@/lib/hooks/ai/useAssistantPolicy";
import type { ExecutionMode } from "@/types/assistant";

export function AssistantPolicyControl({ campaignId, target, id, executionMode = "review" }: { campaignId: string; target: "thread" | "token"; id: string; executionMode?: ExecutionMode }) {
  const [open, setOpen] = useState(false);

  const policy = useAssistantPolicy(campaignId);

  const mode = executionMode;

  const change = async (next: ExecutionMode) => {
    try { await policy.mutateAsync({ target, id, executionMode: next }); setOpen(false); }
    catch { /* The error is shown without trusting a raw server payload. */ }
  };

  return <section aria-label="Режим виконання" className="space-y-2 text-sm">
    <p>Режим: {mode === "auto" ? "auto" : "перегляд"}</p>
    <p className="text-xs">Наявні pending не застосовуються. Видалення, скидання, доступ, session-only та платні дії потребують окремого підтвердження.</p>
    <Button variant="outline" disabled={policy.isPending} onClick={() => mode === "auto" ? void change("review") : setOpen(true)}>{mode === "auto" ? "Повернути перегляд" : "Увімкнути auto"}</Button>
    {policy.isSuccess && policy.data.executionMode !== mode && <p role="status">Сервер прийняв зміну режиму. Чекаємо свіжого стану; за потреби оновіть сторінку.</p>}
    {policy.isError && <p role="alert">Не вдалося змінити режим. Це може зробити лише власник.</p>}
    <ResponsiveDialog open={open} onOpenChange={setOpen} title="Увімкнути auto для наступних дій?" description="Звичайні нові дії виконуватимуться за серверною політикою. Наявні пропозиції не застосуються, права не розширюються." footer={<Button disabled={policy.isPending} onClick={() => void change("auto")}>Увімкнути для наступних дій</Button>}>
      <p>Небезпечні та платні дії завжди залишаються для людського підтвердження. Змінюється лише цей {target === "thread" ? "тред" : "токен"}.</p>
    </ResponsiveDialog>
  </section>;
}
