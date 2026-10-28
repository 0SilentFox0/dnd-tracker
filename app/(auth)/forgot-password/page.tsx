import type { Metadata } from "next";

import { ForgotPasswordScreen } from "@/components/auth/AuthScreens";

export const metadata: Metadata = { title: "Відновлення пароля — D&D Combat Tracker" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
