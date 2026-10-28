import { authMetadata } from "@/app/(auth)/auth-metadata";
import { ForgotPasswordScreen } from "@/components/auth/AuthScreens";

export const generateMetadata = () => authMetadata("forgot.title");

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
