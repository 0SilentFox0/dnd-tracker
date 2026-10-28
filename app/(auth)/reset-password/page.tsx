import { authMetadata } from "@/app/(auth)/auth-metadata";
import { ResetPasswordScreen } from "@/components/auth/AuthScreens";

export const generateMetadata = () => authMetadata("reset.title");

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
