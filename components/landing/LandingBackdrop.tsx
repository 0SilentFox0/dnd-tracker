export function LandingBackdrop() {
    return (
        <>
            <link
                rel="preload"
                as="image"
                href="/bg/vey-strait-2k.webp"
                fetchPriority="high"
                media="(max-width: 1920px)"
            />
            <div className="ld-bg" aria-hidden="true" />
            <div className="ld-light" aria-hidden="true" />
            <div className="ld-vignette" aria-hidden="true" />
        </>
    );
}
