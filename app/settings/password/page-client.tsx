"use client";

import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { useUpdatePassword } from "@/lib/hooks/auth";

export function PasswordSettingsClient() {
  const { session, email, hasPassword, pending, error, done, update } = useUpdatePassword();

  return (
    <HudPage width="md">
      <HudPageHeader
        title={hasPassword ? "Змінити пароль" : "Встановити пароль"}
        subtitle={hasPassword ? "Новий пароль діятиме для входу з email." : "Додайте пароль, щоб входити не лише через Google, а й з email."}
      />
      <HudPanel className="mx-auto w-full max-w-sm space-y-4">
        {session === "checking" ? (
          <LoadingState />
        ) : (
          <>
            {email && <p className="text-sm text-hud-muted">Акаунт: {email}</p>}
            {done && (
              <p role="status" className="rounded-md border border-hud-good-dim bg-[rgba(127,168,106,.1)] p-2 text-sm text-hud-good">
                Пароль збережено
              </p>
            )}
            <NewPasswordForm pending={pending} error={error} submitLabel={hasPassword ? "Змінити пароль" : "Встановити пароль"} onSubmit={(v) => void update(v)} />
          </>
        )}
      </HudPanel>
    </HudPage>
  );
}
