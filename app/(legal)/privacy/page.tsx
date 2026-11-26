import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';

export const generateMetadata = () => buildLegalMetadata('en', 'privacy');

export default function PrivacyPage() {
    return <LegalPage locale="en" doc="privacy" />;
}
