import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';

export const generateMetadata = () => buildLegalMetadata('uk', 'terms');

export default function TermsPageUk() {
    return <LegalPage locale="uk" doc="terms" />;
}
