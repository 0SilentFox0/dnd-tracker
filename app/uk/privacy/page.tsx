import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';

export const generateMetadata = () => buildLegalMetadata('uk', 'privacy');

export default function PrivacyPageUk() {
    return <LegalPage locale="uk" doc="privacy" />;
}
