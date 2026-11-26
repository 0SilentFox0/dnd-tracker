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
            <div className="ld-fog" aria-hidden="true">
                <div className="ld-cloud ld-cloud-a">
                    <i />
                </div>
                <div className="ld-cloud ld-cloud-b">
                    <i />
                </div>
                <div className="ld-cloud ld-cloud-c">
                    <i />
                </div>
            </div>
            <div className="ld-light" aria-hidden="true" />
            <div className="ld-vignette" aria-hidden="true" />
        </>
    );
}
