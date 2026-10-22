import type { Metadata } from "next";

import { SignUpScreen } from "@/components/auth/AuthScreens";

export const metadata: Metadata = { title: "Реєстрація — D&D Combat Tracker" };

export default function SignUpPage() {
  return <SignUpScreen />;
}
