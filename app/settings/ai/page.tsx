import { redirect } from "next/navigation";

import { AiSettingsClient } from "./page-client";

import { isAiConfigured } from "@/lib/ai/crypto";
import { getSessionUserId } from "@/lib/auth";

export default async function AiSettingsPage() {
  if (!(await getSessionUserId())) redirect("/sign-in");

  return <AiSettingsClient configured={isAiConfigured()} />;
}
