"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthDivider, AuthLink, AuthSuspense, CheckEmailNotice, FormError, GoogleAuthButton, ResendConfirmation, useFormErrors } from "@/components/auth/AuthParts";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { AFTER_SIGN_IN_PATH, PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { useAuthUrlError, useEmailSignIn, useEmailSignUp, usePasswordResetRequest, useRedirectIfSignedIn, useUpdatePassword } from "@/lib/hooks/auth";
import { emailSchema, signInSchema, signUpSchema } from "@/lib/schemas/auth";

function SignInCard() {
  const t = useTranslations("auth");

  useRedirectIfSignedIn();

  const urlError = useAuthUrlError();

  const { pending, error, unconfirmedEmail, signIn } = useEmailSignIn();

  const { errors, read } = useFormErrors();

  return (
    <AuthCard
      title={t("signIn.title")}
      description={t("signIn.description")}
      error={urlError}
      footer={
        <p className="text-center text-sm text-hud-muted">
          {t("signIn.noAccount")} <AuthLink href="/sign-up">{t("signIn.signUpLink")}</AuthLink>
        </p>
      }
    >
      <GoogleAuthButton label={t("signIn.google")} />
      <AuthDivider />
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          const values = read(signInSchema, e);

          if (values) void signIn(values);
        }}
      >
        <LabeledInput label={t("common.email")} id="sign-in-email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <PasswordInput label={t("common.password")} id="sign-in-password" name="password" autoComplete="current-password" error={errors.password} />
        <p className="text-right text-sm">
          <AuthLink href="/forgot-password">{t("signIn.forgotLink")}</AuthLink>
        </p>
        <FormError message={error} />
        {unconfirmedEmail && <ResendConfirmation email={unconfirmedEmail} />}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? t("signIn.submitting") : t("signIn.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}

function SignUpCard() {
  const t = useTranslations("auth");

  const tRoot = useTranslations();

  useRedirectIfSignedIn();

  const urlError = useAuthUrlError();

  const { pending, error, sentTo, signUp, reset } = useEmailSignUp();

  const { errors, read } = useFormErrors();

  if (sentTo) {
    return (
      <AuthCard title={t("signUp.checkTitle")} description={t("signUp.checkDescription")}>
        <CheckEmailNotice email={sentTo}>
          <p className="text-hud-muted">{t("signUp.existingNote")}</p>
          <ResendConfirmation email={sentTo} />
          <div className="flex justify-between text-sm">
            <button type="button" onClick={reset} className="text-hud-gold hover:text-hud-gold-strong">
              {t("signUp.changeEmail")}
            </button>
            <AuthLink href="/sign-in">{t("common.backToSignIn")}</AuthLink>
          </div>
        </CheckEmailNotice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("signUp.title")}
      description={t("signUp.description")}
      error={urlError}
      footer={
        <p className="text-center text-sm text-hud-muted">
          {t("signUp.haveAccount")} <AuthLink href="/sign-in">{t("signUp.signInLink")}</AuthLink>
        </p>
      }
    >
      <GoogleAuthButton label={t("signUp.google")} />
      <AuthDivider />
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          const values = read(signUpSchema, e);

          if (values) void signUp(values);
        }}
      >
        <LabeledInput
          label={t("signUp.displayName")}
          id="sign-up-name"
          name="displayName"
          autoComplete="nickname"
          error={errors.displayName}
          description={t("signUp.displayNameHint")}
        />
        <LabeledInput label={t("common.email")} id="sign-up-email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <PasswordInput
          label={t("common.password")}
          id="sign-up-password"
          name="password"
          autoComplete="new-password"
          error={errors.password}
          description={tRoot("validation.minLength", { minimum: PASSWORD_MIN_LENGTH })}
        />
        <PasswordInput label={t("common.confirmPassword")} id="sign-up-confirm" name="confirm" autoComplete="new-password" error={errors.confirm} />
        <FormError message={error} />
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? t("signUp.submitting") : t("signUp.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}

function ForgotPasswordCard() {
  const t = useTranslations("auth");

  const urlError = useAuthUrlError();

  const { pending, error, sentTo, send } = usePasswordResetRequest();

  const { errors, read } = useFormErrors();

  if (sentTo) {
    return (
      <AuthCard title={t("forgot.checkTitle")} description={t("forgot.checkDescription")}>
        <CheckEmailNotice email={sentTo}>
          <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => void send(sentTo)}>
            {pending ? t("common.sending") : t("forgot.resend")}
          </Button>
          <FormError message={error} />
          <p className="text-center text-sm">
            <AuthLink href="/sign-in">{t("common.backToSignIn")}</AuthLink>
          </p>
        </CheckEmailNotice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("forgot.title")}
      description={t("forgot.description")}
      error={urlError}
      footer={
        <p className="text-center text-sm text-hud-muted">
          {t("forgot.remembered")} <AuthLink href="/sign-in">{t("forgot.signInLink")}</AuthLink>
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
        <LabeledInput label={t("common.email")} id="forgot-email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <FormError message={error} />
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? t("common.sending") : t("forgot.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordScreen() {
  const t = useTranslations("auth");

  const { session, pending, error, done, update } = useUpdatePassword();

  if (session === "checking") return <AuthCard title={t("reset.title")}>{t("reset.checking")}</AuthCard>;

  if (session === "missing") {
    return (
      <AuthCard title={t("reset.invalidTitle")} description={t("reset.invalidDescription")}>
        <Button asChild className="w-full" size="lg">
          <Link href="/forgot-password">{t("reset.newLink")}</Link>
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title={t("reset.doneTitle")} description={t("reset.doneDescription")}>
        <Button asChild className="w-full" size="lg">
          <Link href={AFTER_SIGN_IN_PATH}>{t("reset.toCampaigns")}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("reset.title")} description={t("reset.description")}>
      <NewPasswordForm pending={pending} error={error} submitLabel={t("reset.save")} onSubmit={(v) => void update(v)} />
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
