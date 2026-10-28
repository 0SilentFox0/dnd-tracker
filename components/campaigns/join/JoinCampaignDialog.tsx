"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useJoinCampaign } from "@/lib/hooks/campaigns";
import { joinErrorMessage } from "@/lib/utils/campaigns/join-error";

export function JoinCampaignDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [inviteCode, setInviteCode] = useState("");

  const join = useJoinCampaign();

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  const loading = join.isPending;

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      setError("Введіть код запрошення");

      return;
    }

    setError(null);
    setSuccess(false);
    join.mutate(inviteCode.trim(), {
      onSuccess: (result) => {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/campaigns/${result.campaign.id}`);
          router.refresh();
        }, 1000);
      },
      onError: (err) => setError(joinErrorMessage(err)),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);

    if (!newOpen) {
      setInviteCode("");
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <>
      <Button onClick={() => handleOpenChange(true)} variant="outline">
        Приєднатися до кампанії
      </Button>
      <ResponsiveDialog
        hud
        open={open}
        onOpenChange={handleOpenChange}
        title="Приєднатися до кампанії"
        description="Введіть код запрошення, який вам надав DM кампанії"
        footer={
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading || success}>
              Скасувати
            </Button>
            <Button onClick={handleJoin} disabled={loading || success || !inviteCode.trim()}>
              {loading ? "Приєднання..." : success ? "Успішно!" : "Приєднатися"}
            </Button>
          </>
        }
      >
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
            <div className="flex items-center gap-2 p-3 rounded-md bg-hud-field text-sm text-hud-danger shadow-[inset_0_0_0_1px_var(--color-hud-danger)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-hud-field text-sm text-hud-gold shadow-[inset_0_0_0_1px_var(--color-hud-gold)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Успішно приєднано! Перенаправлення...</span>
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </>
  );
}
