"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthDivider, AuthLink, AuthSuspense, CheckEmailNotice, FormError, GoogleAuthButton, ResendConfirmation } from "@/components/auth/AuthParts";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { AFTER_SIGN_IN_PATH, PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { useAuthUrlError, useEmailSignIn, useEmailSignUp, usePasswordResetRequest, useRedirectIfSignedIn, useUpdatePassword } from "@/lib/hooks/auth";
import { emailSchema, signInSchema, signUpSchema } from "@/lib/schemas/auth";
import { parseForm } from "@/lib/utils/auth";

function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const read = <T,>(schema: Parameters<typeof parseForm<T>>[0], e: FormEvent<HTMLFormElement>): T | null => {
    e.preventDefault();

    const result = parseForm(schema, e.currentTarget);

    setErrors(result.errors ?? {});

    return result.data;
  };

  return { errors, read };
}

function SignInCard() {
  useRedirectIfSignedIn();

  const urlError = useAuthUrlError();

  const { pending, error, unconfirmedEmail, signIn } = useEmailSignIn();

  const { errors, read } = useFormErrors();

  return (
    <AuthCard
      title="Вхід"
      description="Увійдіть, щоб продовжити кампанію"
      error={urlError}
      footer={
        <p className="text-center text-sm text-hud-muted">
          Немає акаунта? <AuthLink href="/sign-up">Зареєструватися</AuthLink>
        </p>
      }
    >
      <GoogleAuthButton label="Увійти через Google" />
      <AuthDivider />
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          const values = read(signInSchema, e);

          if (values) void signIn(values);
        }}
      >
        <LabeledInput label="Email" id="sign-in-email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <PasswordInput label="Пароль" id="sign-in-password" name="password" autoComplete="current-password" error={errors.password} />
        <p className="text-right text-sm">
          <AuthLink href="/forgot-password">Забули пароль?</AuthLink>
        </p>
        <FormError message={error} />
        {unconfirmedEmail && <ResendConfirmation email={unconfirmedEmail} />}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Вхід..." : "Увійти"}
        </Button>
      </form>
    </AuthCard>
  );
}

function SignUpCard() {
  useRedirectIfSignedIn();

  const urlError = useAuthUrlError();

  const { pending, error, sentTo, signUp, reset } = useEmailSignUp();

  const { errors, read } = useFormErrors();

  if (sentTo) {
    return (
      <AuthCard title="Перевірте пошту" description="Залишився один крок — підтвердити адресу">
        <CheckEmailNotice email={sentTo}>
          <p className="text-hud-muted">Якщо акаунт із цією поштою вже існує, лист не прийде — просто увійдіть або відновіть пароль.</p>
          <ResendConfirmation email={sentTo} />
          <div className="flex justify-between text-sm">
            <button type="button" onClick={reset} className="text-hud-gold hover:text-hud-gold-strong">
              Змінити email
            </button>
            <AuthLink href="/sign-in">До входу</AuthLink>
          </div>
        </CheckEmailNotice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Реєстрація"
      description="Створіть акаунт — це безкоштовно"
      error={urlError}
      footer={
        <p className="text-center text-sm text-hud-muted">
          Вже є акаунт? <AuthLink href="/sign-in">Увійти</AuthLink>
        </p>
      }
    >
      <GoogleAuthButton label="Зареєструватися через Google" />
      <AuthDivider />
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          const values = read(signUpSchema, e);

          if (values) void signUp(values);
        }}
      >
        <LabeledInput label="Ім'я" id="sign-up-name" name="displayName" autoComplete="nickname" error={errors.displayName} description="Так вас бачитимуть у кампаніях" />
        <LabeledInput label="Email" id="sign-up-email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <PasswordInput label="Пароль" id="sign-up-password" name="password" autoComplete="new-password" error={errors.password} description={`Щонайменше ${PASSWORD_MIN_LENGTH} символів`} />
        <PasswordInput label="Повторіть пароль" id="sign-up-confirm" name="confirm" autoComplete="new-password" error={errors.confirm} />
        <FormError message={error} />
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Створення..." : "Створити акаунт"}
        </Button>
      </form>
    </AuthCard>
  );
}

function ForgotPasswordCard() {
  const urlError = useAuthUrlError();

  const { pending, error, sentTo, send } = usePasswordResetRequest();

  const { errors, read } = useFormErrors();

  if (sentTo) {
    return (
      <AuthCard title="Перевірте пошту" description="Посилання для нового пароля вже в дорозі">
        <CheckEmailNotice email={sentTo}>
          <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => void send(sentTo)}>
            {pending ? "Надсилання..." : "Надіслати ще раз"}
          </Button>
          <FormError message={error} />
          <p className="text-center text-sm">
            <AuthLink href="/sign-in">До входу</AuthLink>
          </p>
        </CheckEmailNotice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Відновлення пароля"
      description="Вкажіть пошту акаунта — надішлемо посилання для нового пароля"
      error={urlError}
      footer={
        <p className="text-center text-sm text-hud-muted">
          Згадали пароль? <AuthLink href="/sign-in">Увійти</AuthLink>
        </p>
      }
    >
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          const values = read(emailSchema, e);

          if (values) void send(values.email);
        }}
      >
        <LabeledInput label="Email" id="forgot-email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <FormError message={error} />
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Надсилання..." : "Надіслати посилання"}
        </Button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordScreen() {
  const { session, pending, error, done, update } = useUpdatePassword();

  if (session === "checking") return <AuthCard title="Новий пароль">Перевіряємо посилання...</AuthCard>;

  if (session === "missing") {
    return (
      <AuthCard title="Посилання недійсне" description="Воно застаріло, уже використане або відкрите в іншому браузері">
        <Button asChild className="w-full" size="lg">
          <Link href="/forgot-password">Надіслати новий лист</Link>
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Пароль змінено" description="Тепер можна входити з новим паролем">
        <Button asChild className="w-full" size="lg">
          <Link href={AFTER_SIGN_IN_PATH}>До кампаній</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Новий пароль" description="Придумайте пароль для входу">
      <NewPasswordForm pending={pending} error={error} submitLabel="Зберегти пароль" onSubmit={(v) => void update(v)} />
    </AuthCard>
  );
}

export function SignInScreen() {
  return (
    <AuthSuspense>
      <SignInCard />
    </AuthSuspense>
  );
}

export function SignUpScreen() {
  return (
    <AuthSuspense>
      <SignUpCard />
    </AuthSuspense>
  );
}

export function ForgotPasswordScreen() {
  return (
    <AuthSuspense>
      <ForgotPasswordCard />
    </AuthSuspense>
  );
}
