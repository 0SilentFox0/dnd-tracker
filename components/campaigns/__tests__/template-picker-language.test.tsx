// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TemplatePicker } from '@/components/campaigns/templates/TemplatePicker';
import type { TemplateCard } from '@/types/campaigns';

const card = (id: string, locale: string | null): TemplateCard => ({
    id,
    name: 'SRD',
    description: null,
    visibility: 'official',
    counts: {},
    locale,
    templateKey: 'srd',
});

vi.mock('@/components/ui/select-field', () => ({
    SelectField: ({
        value,
        onValueChange,
        groups,
        'aria-label': label,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        groups: { options: { value: string; label: string }[] }[];
        'aria-label': string;
    }) => (
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {groups
                .flatMap((g) => g.options)
                .map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
        </select>
    ),
}));

let official: TemplateCard[] = [];

let uiLocale = 'uk';

vi.mock('next-intl', async () => {
    const { makeT } = await import('@/lib/i18n/test/mock-t');

    return {
        useLocale: () => uiLocale,
        useTranslations: (ns: string) => makeT(ns),
    };
});

vi.mock('@/lib/hooks/campaigns', () => ({
    useTemplates: () => ({ data: { official, mine: [] } }),
    useBundleFilePicker: () => ({
        file: null,
        status: { error: null, success: null, isLoading: false },
        actions: {
            handleFileChange: vi.fn(),
            handleImport: vi.fn(),
            reset: vi.fn(),
        },
    }),
}));

describe('TemplatePicker: мова шаблону', () => {
    afterEach(() => {
        cleanup();
        uiLocale = 'uk';
    });

    const canonical = () => ({
        ...card('canonical', 'en'),
        kind: 'template',
        templateKey: 'srd-5.2',
        availableLocales: ['en', 'uk'],
    });

    it('uses one SRD id and emits the displayed default language, then preserves explicit selection across UI changes', () => {
        official = [canonical()];

        const onChange = vi.fn();

        const { rerender } = render(
            <TemplatePicker
                value={{ templateId: 'canonical' }}
                onChange={onChange}
            />
        );

        expect(onChange).toHaveBeenLastCalledWith({
            templateId: 'canonical',
            contentLocale: 'uk',
        });
        expect(
            (
                screen.getByLabelText(
                    'campaigns.templatePicker.languageLabel'
                ) as HTMLSelectElement
            ).value
        ).toBe('uk');

        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.languageLabel'),
            { target: { value: 'en' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({
            templateId: 'canonical',
            contentLocale: 'en',
        });
        rerender(
            <TemplatePicker
                value={{ templateId: 'canonical', contentLocale: 'en' }}
                onChange={onChange}
            />
        );
        onChange.mockClear();
        uiLocale = 'en';
        rerender(
            <TemplatePicker
                value={{ templateId: 'canonical', contentLocale: 'en' }}
                onChange={onChange}
            />
        );
        expect(
            (
                screen.getByLabelText(
                    'campaigns.templatePicker.languageLabel'
                ) as HTMLSelectElement
            ).value
        ).toBe('en');
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.languageLabel'),
            { target: { value: 'uk' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({
            templateId: 'canonical',
            contentLocale: 'uk',
        });
    });

    it('defaults unsupported interface languages to English and clears locale when changing source', () => {
        uiLocale = 'pl';
        official = [canonical(), card('other', 'uk')];

        const onChange = vi.fn();

        const { rerender } = render(
            <TemplatePicker value={{ templateId: null }} onChange={onChange} />
        );

        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.ariaLabel'),
            { target: { value: 'canonical' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({
            templateId: 'canonical',
            contentLocale: 'en',
        });
        rerender(
            <TemplatePicker
                value={{ templateId: 'canonical', contentLocale: 'uk' }}
                onChange={onChange}
            />
        );
        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.ariaLabel'),
            { target: { value: 'other' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({ templateId: 'other' });
        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.ariaLabel'),
            { target: { value: '__none' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({ templateId: null });
    });

    it('одна картка на групу, перемикач мови віддає id варіанта', () => {
        official = [card('en1', null), card('uk1', 'uk')];

        const onChange = vi.fn();

        render(
            <TemplatePicker value={{ templateId: 'uk1' }} onChange={onChange} />
        );

        expect(screen.getAllByRole('option', { name: 'SRD' })).toHaveLength(1);

        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.languageLabel'),
            { target: { value: 'en1' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({ templateId: 'en1' });
    });

    it('з одним варіантом перемикача немає', () => {
        official = [card('en1', null)];

        render(
            <TemplatePicker value={{ templateId: 'en1' }} onChange={vi.fn()} />
        );

        expect(
            screen.queryByLabelText('campaigns.templatePicker.languageLabel')
        ).toBeNull();
    });

    it('offers the content language for the canonical Grim', () => {
        official = [
            {
                ...card('grim', 'en'),
                kind: 'template',
                templateKey: 'grim-d100',
                availableLocales: ['en', 'uk'],
            },
        ];

        const onChange = vi.fn();

        render(
            <TemplatePicker
                value={{ templateId: 'grim', contentLocale: 'en' }}
                onChange={onChange}
            />
        );
        fireEvent.change(
            screen.getByLabelText('campaigns.templatePicker.languageLabel'),
            { target: { value: 'uk' } }
        );
        expect(onChange).toHaveBeenLastCalledWith({
            templateId: 'grim',
            contentLocale: 'uk',
        });
    });
});
