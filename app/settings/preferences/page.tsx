import { redirect } from "next/navigation";

import { PreferencesClient } from "./page-client";

import { getSessionUserId } from "@/lib/auth";

export default async function PreferencesPage() {
  if (!(await getSessionUserId())) redirect("/sign-in?next=/settings/preferences");

  return <PreferencesClient />;
}
