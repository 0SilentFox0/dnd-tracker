const isHeaderLine = (line: string) => {
    const parts = line.split(' · ');

    return (
        parts.length >= 5 && parts.filter((p) => p.includes(': ')).length >= 4
    );
};

export function spellDescriptionBody(description: string): string {
    const [first, ...rest] = description.split('\n');

    if (!isHeaderLine(first)) return description;

    return rest.join('\n').replace(/^\n+/, '');
}
