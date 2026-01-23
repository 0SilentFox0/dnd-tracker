"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinCampaign } from "@/lib/api/campaigns";

export function JoinCampaignDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [inviteCode, setInviteCode] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Введіть код запрошення");

      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await joinCampaign(inviteCode.trim());

      setSuccess(true);
      
      // Перенаправляємо на кампанію через 1 секунду
      setTimeout(() => {
        router.push(`/campaigns/${result.campaign.id}`);
        router.refresh();
      }, 1000);
    } catch (err) {
      let errorMessage = "Помилка приєднання до кампанії";

      if (err instanceof Error) {
        errorMessage = err.message;

        // Перекладаємо стандартні помилки
        if (errorMessage.includes("Campaign not found")) {
          errorMessage = "Кампанію не знайдено. Перевірте код запрошення.";
        } else if (errorMessage.includes("Already a member")) {
          errorMessage = "Ви вже є учасником цієї кампанії.";
        } else if (errorMessage.includes("not active")) {
          errorMessage = "Кампанія неактивна.";
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);

    if (!newOpen) {
      // Скидаємо стан при закритті
      setInviteCode("");
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Приєднатися до кампанії</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Приєднатися до кампанії</DialogTitle>
          <DialogDescription>
            Введіть код запрошення, який вам надав DM кампанії
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Код запрошення</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Введіть код запрошення"
              disabled={loading || success}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && !success) {
                  handleJoin();
                }
              }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Успішно приєднано! Перенаправлення...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading || success}
          >
            Скасувати
          </Button>
          <Button onClick={handleJoin} disabled={loading || success || !inviteCode.trim()}>
            {loading ? "Приєднання..." : success ? "Успішно!" : "Приєднатися"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
