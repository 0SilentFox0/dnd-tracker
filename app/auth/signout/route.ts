import { type NextRequest, NextResponse } from "next/server";

import { rejectCrossOriginMutation } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const csrfReject = rejectCrossOriginMutation(request);

  if (csrfReject) return csrfReject;

  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  // the global sign-out needs the auth server; a local one still clears this browser's cookies
  if (error) await supabase.auth.signOut({ scope: "local" });

  const url = request.nextUrl.clone();

  url.pathname = "/sign-in";
  url.search = "";

  return NextResponse.redirect(url, 303);
}
