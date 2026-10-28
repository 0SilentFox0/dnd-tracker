import type { Metadata } from "next";

import { FAQ } from "@/components/landing/content";
import { LandingPage } from "@/components/landing/LandingPage";
import { SITE_URL } from "@/lib/constants/site";

const TITLE = "D&D Combat Tracker — помічник ДМ «все в одному» для D&D 5e";

const DESCRIPTION =
  "Усе для ведучого D&D в одному вікні: трекер ініціативи, бойова мапа, листи героїв, сценарій, показ сцен, музика й AI-асистент. Без зайвих додатків — створіть власну кампанію або візьміть готовий шаблон D&D 5e.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "D&D",
    "DnD",
    "D&D 5e",
    "ДнД",
    "Підземелля і дракони",
    "помічник ДМ",
    "інструменти ДМ",
    "трекер ініціативи",
    "бойовий трекер",
    "віртуальний стіл",
    "VTT",
    "лист персонажа онлайн",
    "менеджер кампанії",
    "DM tools",
    "initiative tracker",
    "virtual tabletop",
    "campaign manager",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "D&D Combat Tracker",
    locale: "uk_UA",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/landing/hero-dice.webp", width: 1920, height: 1080, alt: "Металеві кубики D&D" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/landing/hero-dice.webp"] },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "D&D Combat Tracker",
      url: SITE_URL,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      inLanguage: "uk",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: ["Трекер ініціативи", "Бойова мапа", "Листи героїв", "Сценарій кампанії", "Показ сцен гравцям", "Музика", "AI-асистент ДМ", "Шаблони кампаній D&D 5e"],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <LandingPage />
    </>
  );
}
