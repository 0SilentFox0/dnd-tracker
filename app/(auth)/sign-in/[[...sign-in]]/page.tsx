import type { Metadata } from "next";

import { SignInScreen } from "@/components/auth/AuthScreens";

export const metadata: Metadata = { title: "Вхід — D&D Combat Tracker" };

export default function SignInPage() {
  return <SignInScreen />;
}
