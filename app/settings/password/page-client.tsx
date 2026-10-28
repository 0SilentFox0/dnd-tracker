"use client";

import { useTranslations } from "next-intl";

import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { useUpdatePassword } from "@/lib/hooks/auth";

export function PasswordSettingsClient() {
  const t = useTranslations("auth.settings");

  const { session, email, hasPassword, pending, error, done, update } = useUpdatePassword();

  return (
    <HudPage width="md">
      <HudPageHeader
        title={hasPassword ? t("changeTitle") : t("setTitle")}
        subtitle={hasPassword ? t("changeSubtitle") : t("setSubtitle")}
      />
      <HudPanel className="mx-auto w-full max-w-sm space-y-4">
        {session === "checking" ? (
          <LoadingState />
        ) : (
          <>
            {email && <p className="text-sm text-hud-muted">{t("account", { email })}</p>}
            {done && (
              <p role="status" className="rounded-md border border-hud-good-dim bg-[rgba(127,168,106,.1)] p-2 text-sm text-hud-good">
                {t("saved")}
              </p>
            )}
            <NewPasswordForm pending={pending} error={error} submitLabel={hasPassword ? t("changeTitle") : t("setTitle")} onSubmit={(v) => void update(v)} />
          </>
        )}
      </HudPanel>
    </HudPage>
  );
}
