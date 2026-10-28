import { redirect } from "next/navigation";

import { PasswordSettingsClient } from "./page-client";

import { getSessionUserId } from "@/lib/auth";

export default async function PasswordSettingsPage() {
  if (!(await getSessionUserId())) redirect("/sign-in?next=/settings/password");

  return <PasswordSettingsClient />;
}
