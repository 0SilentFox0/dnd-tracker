import type { Metadata } from "next";

import { ResetPasswordScreen } from "@/components/auth/AuthScreens";

export const metadata: Metadata = { title: "Новий пароль — D&D Combat Tracker" };

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
