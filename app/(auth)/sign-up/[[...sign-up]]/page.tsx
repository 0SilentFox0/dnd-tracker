import { authMetadata } from "@/app/(auth)/auth-metadata";
import { SignUpScreen } from "@/components/auth/AuthScreens";

export const generateMetadata = () => authMetadata("signUp.title");

export default function SignUpPage() {
  return <SignUpScreen />;
}
