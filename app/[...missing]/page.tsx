import { notFound } from 'next/navigation';

// Unmatched URLs otherwise get the build-time prerendered 404, whose header (pathname, auth) never matches the client → React #418.
export default function MissingPage() {
    notFound();
}
