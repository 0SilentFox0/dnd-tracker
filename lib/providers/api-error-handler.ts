import type { ApiErrorPayload } from "@/lib/api";

let redirecting = false;

export function resetUnauthorizedRedirect() {
  redirecting = false;
}

export function handleApiError({ status, message, url }: ApiErrorPayload) {
  if (typeof window === "undefined") return;

  console.error("[API Error]", status, url, message);

  if (status !== 401 || redirecting || window.location.pathname.startsWith("/sign-in")) return;

  redirecting = true;
  window.location.assign("/sign-in");
}
