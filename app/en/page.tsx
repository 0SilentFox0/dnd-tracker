import { buildLandingMetadata } from "@/components/landing/landing-metadata";
import { LandingPage } from "@/components/landing/LandingPage";

export const generateMetadata = () => buildLandingMetadata("en");

export default function EnglishHomePage() {
  return <LandingPage locale="en" />;
}
