import { authMetadata } from "@/app/(auth)/auth-metadata";
import { SignInScreen } from "@/components/auth/AuthScreens";

export const generateMetadata = () => authMetadata("signIn.title");

export default function SignInPage() {
  return <SignInScreen />;
}
