"use client";

import { type ReactNode, Suspense } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { HudPage, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useGoogleOAuth, useResendConfirmation } from "@/lib/hooks/auth";

// useSearchParams on a static page needs a Suspense boundary
export function AuthSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <HudPage width="md" className="flex min-h-[80vh] items-center justify-center">
          <HudPanel className="w-full max-w-sm text-center">Завантаження...</HudPanel>
        </HudPage>
      }
    >
      {children}
    </Suspense>
  );
}

export function GoogleAuthButton({ label }: { label: string }) {
  const { loading, start } = useGoogleOAuth();

  return (
    <Button type="button" variant="outline" onClick={start} disabled={loading} className="w-full" size="lg">
      <svg viewBox="0 0 48 48" aria-hidden className="size-4">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {loading ? "Перенаправлення..." : label}
    </Button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-hud-muted" aria-hidden>
      <span className="h-px flex-1 bg-hud-rule" />
      або
      <span className="h-px flex-1 bg-hud-rule" />
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p role="alert" className="rounded-md border border-hud-danger bg-[rgba(208,112,92,.1)] p-2 text-sm text-hud-danger">
      {message}
    </p>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-hud-gold underline-offset-4 hover:text-hud-gold-strong hover:underline">
      {children}
    </Link>
  );
}

export function ResendConfirmation({ email }: { email: string }) {
  const { pending, error, sent, resend } = useResendConfirmation();

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" disabled={pending || sent} onClick={() => void resend(email)}>
        {sent ? "Лист надіслано ще раз" : pending ? "Надсилання..." : "Надіслати лист ще раз"}
      </Button>
      <FormError message={error} />
    </div>
  );
}

export function CheckEmailNotice({ email, children }: { email: string; children?: ReactNode }) {
  return (
    <div className="space-y-4 text-sm text-hud-bone">
      <div className="flex items-start gap-3">
        <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-hud-gold" />
        <p>
          Ми надіслали лист на <span className="font-medium text-hud-ink">{email}</span>. Відкрийте посилання з нього в цьому ж браузері. Якщо листа немає — перевірте «Спам».
        </p>
      </div>
      {children}
    </div>
  );
}
