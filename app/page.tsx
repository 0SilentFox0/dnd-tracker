import { buildLandingMetadata } from "@/components/landing/landing-metadata";
import { LandingPage } from "@/components/landing/LandingPage";

export const generateMetadata = () => buildLandingMetadata("uk");

export default function HomePage() {
  return <LandingPage locale="uk" />;
}
