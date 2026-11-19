export const RAW_CONTROL_TAGS = [
    'button',
    'input',
    'select',
    'img',
    'textarea',
    'details',
];

export const RAW_CONTROL_FILES = [
    'components/**/*.tsx',
    'app/**/*.tsx',
    'systems/**/*.tsx',
];

export const RAW_CONTROL_IGNORES = [
    'components/ui/**',
    'components/hud/**',
    '**/__tests__/**',
    '**/*.test.tsx',
];

const rule = {
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            raw: 'Сирий <{{tag}}>: використайте kit (components/ui, components/hud: Textarea, Disclosure; Slider для type=range, next/image для img). Baseline ratchets/raw-controls-exempt.json лише скорочується.',
        },
    },
    create(context) {
        return {
            JSXOpeningElement(node) {
                const tag =
                    node.name.type === 'JSXIdentifier' && node.name.name;

                if (!tag || !RAW_CONTROL_TAGS.includes(tag)) return;

                context.report({ node, messageId: 'raw', data: { tag } });
            },
        };
    },
};

export const rawControlsPlugin = { rules: { 'no-raw-control': rule } };
