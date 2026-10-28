import { redirect } from "next/navigation";

import { getAuthUserOptional } from "@/lib/auth";

export default async function HomePage() {
  const user = await getAuthUserOptional();
  
  if (user) {
    redirect("/campaigns");
  } else {
    redirect("/sign-in");
  }
}
