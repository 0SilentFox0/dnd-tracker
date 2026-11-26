import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';

export const generateMetadata = () => buildLegalMetadata('en', 'cookies');

export default function CookiesPage() {
    return <LegalPage locale="en" doc="cookies" />;
}
