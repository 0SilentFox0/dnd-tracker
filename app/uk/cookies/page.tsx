import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';

export const generateMetadata = () => buildLegalMetadata('uk', 'cookies');

export default function CookiesPageUk() {
    return <LegalPage locale="uk" doc="cookies" />;
}
