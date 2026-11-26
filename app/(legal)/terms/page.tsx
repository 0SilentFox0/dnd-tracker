import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';

export const generateMetadata = () => buildLegalMetadata('en', 'terms');

export default function TermsPage() {
    return <LegalPage locale="en" doc="terms" />;
}
