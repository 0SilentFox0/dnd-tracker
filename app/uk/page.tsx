import { buildLandingMetadata } from "@/components/landing/landing-metadata";
import { LandingPage } from "@/components/landing/LandingPage";

export const generateMetadata = () => buildLandingMetadata("uk");

export default function HomePageUk() {
  return <LandingPage locale="uk" />;
}
