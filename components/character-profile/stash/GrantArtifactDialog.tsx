'use client';

import { useProfile } from '../ProfileContext';

import { EntityIcon } from '@/components/common/EntityIcon';
import { EmptyState, LoadingState } from '@/components/common/states';
import { HudButton } from '@/components/hud';
import { HUD_SELECT_CLASS } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SelectField } from '@/components/ui/select-field';
import { ITEM_LIMITS } from '@/lib/constants/artifacts';
import { useGrantArtifactForm } from '@/lib/hooks/characters';
import { useTranslator } from '@/lib/i18n/use-translator';
import { composedName } from '@/lib/utils/items/compose';
import type { FreeArtifact } from '@/types/inventory';

const [MIN_QTY, MAX_QTY] = ITEM_LIMITS.grantQuantity;

interface GrantArtifactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ROW =
    'flex min-h-11 w-full items-center gap-3 border-b border-hud-raised py-2 text-left disabled:opacity-50';

function ArtifactRow({
    a,
    subtitle,
    disabled,
    onClick,
}: {
    a: FreeArtifact;
    subtitle: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <li>
            <HudButton
                type="button"
                disabled={disabled}
                onClick={onClick}
                className={ROW}
            >
                <span aria-hidden="true">
                    <EntityIcon
                        src={a.icon}
                        name={a.name}
                        size={36}
                        className="hud-sc size-9 rounded-md border border-hud-line bg-transparent text-inherit"
                    />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm text-hud-ink">
                        {a.name}
                    </span>
                    <span className="block text-xs text-hud-muted">
                        {subtitle}
                    </span>
                </span>
            </HudButton>
        </li>
    );
}

export function GrantArtifactDialog({
    open,
    onOpenChange,
}: GrantArtifactDialogProps) {
    const { campaignId, characterId } = useProfile();

    const t = useTranslator();

    const form = useGrantArtifactForm({
        campaignId,
        characterId,
        open,
        onOpenChange,
    });

    const { picked, artifacts, selectedBase, actions, fields } = form;

    const property = picked?.property;

    const kindLabel = (a: FreeArtifact) =>
        a.property
            ? t('inventory.grant.kind.property')
            : a.consumable
              ? t('inventory.grant.kind.consumable')
              : a.gear
                ? t('inventory.grant.kind.gear')
                : null;

    const subtitle = (a: FreeArtifact) =>
        [t(`artifacts.slots.${a.slot}`), kindLabel(a)]
            .filter(Boolean)
            .join(' · ');

    return (
        <ResponsiveDialog
            hud
            open={open}
            onOpenChange={actions.close}
            title={
                picked?.property
                    ? t('inventory.grant.baseTitle', { name: picked.name })
                    : t('inventory.grant.title')
            }
            footer={
                form.detail && !form.isLoading ? (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={actions.back}
                        >
                            {t('common.actions.back')}
                        </Button>
                        <Button
                            type="button"
                            disabled={!form.canGrant}
                            onClick={actions.submit}
                        >
                            {t('inventory.grant.submit')}
                        </Button>
                    </>
                ) : undefined
            }
        >
            {form.isLoading ? (
                <LoadingState rows={3} />
            ) : picked && form.detail ? (
                <div className="space-y-2">
                    {property && (
                        <>
                            <Label
                                htmlFor="grant-base-search"
                                className="sr-only"
                            >
                                {t('inventory.grant.baseSearch')}
                            </Label>
                            <Input
                                id="grant-base-search"
                                placeholder={t('inventory.grant.baseSearch')}
                                value={fields.query}
                                onChange={(e) =>
                                    actions.setQuery(e.target.value)
                                }
                            />
                            {form.bases.length === 0 ? (
                                <EmptyState
                                    title={t('inventory.grant.noBases')}
                                />
                            ) : (
                                <ul>
                                    {form.bases.map((b) => (
                                        <ArtifactRow
                                            key={b.id}
                                            a={b}
                                            subtitle={`${composedName(b, picked, property.nameTemplate)} · ${picked.rarity ? t(`artifacts.rarity.${picked.rarity}`) : ''}`}
                                            disabled={form.isPending}
                                            onClick={() =>
                                                actions.setBaseId(b.id)
                                            }
                                        />
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                    <p className="text-sm text-hud-ink">
                        {property && selectedBase
                            ? composedName(
                                  selectedBase,
                                  picked,
                                  property.nameTemplate
                              )
                            : picked.name}
                    </p>
                    {form.parameterRequired && (
                        <>
                            <Label htmlFor="grant-parameter">
                                {t('inventory.grant.parameter')}
                            </Label>
                            <SelectField
                                id="grant-parameter"
                                triggerClassName={`${HUD_SELECT_CLASS} w-full`}
                                value={fields.parameter}
                                onValueChange={actions.setParameter}
                                allowNone
                                noneLabel={t('inventory.grant.chooseParameter')}
                                options={form.parameterOptions.map(
                                    (option) => ({
                                        value: option.key,
                                        label: option.label,
                                    })
                                )}
                            />
                        </>
                    )}
                    {picked.consumable && (
                        <>
                            {form.spellOptions.length > 0 && (
                                <>
                                    <Label htmlFor="grant-spell">
                                        {t('inventory.grant.spell')}
                                    </Label>
                                    <SelectField
                                        id="grant-spell"
                                        triggerClassName={`${HUD_SELECT_CLASS} w-full`}
                                        value={fields.spellId}
                                        onValueChange={actions.setSpellId}
                                        allowNone
                                        noneLabel={t(
                                            'inventory.grant.chooseSpell'
                                        )}
                                        options={form.spellOptions.map(
                                            (spell) => ({
                                                value: spell.spellId,
                                                label:
                                                    spell.castLevel !==
                                                    undefined
                                                        ? t(
                                                              'inventory.grant.spellOption',
                                                              {
                                                                  label: spell.label,
                                                                  level: spell.castLevel,
                                                              }
                                                          )
                                                        : spell.label,
                                            })
                                        )}
                                    />
                                    <p className="text-xs text-hud-muted">
                                        {t('inventory.grant.spellNote')}
                                    </p>
                                </>
                            )}
                            <Label htmlFor="grant-quantity">
                                {t('inventory.grant.quantity')}
                            </Label>
                            <Input
                                id="grant-quantity"
                                type="number"
                                min={MIN_QTY}
                                max={MAX_QTY}
                                value={fields.quantity}
                                onChange={(e) =>
                                    actions.setQuantity(e.target.value)
                                }
                            />
                        </>
                    )}
                </div>
            ) : artifacts.length === 0 ? (
                <EmptyState title={t('inventory.grant.noArtifacts')} />
            ) : (
                <ul>
                    {artifacts.map((a) => (
                        <ArtifactRow
                            key={a.id}
                            a={a}
                            subtitle={subtitle(a)}
                            disabled={form.isPending}
                            onClick={() => actions.pick(a)}
                        />
                    ))}
                </ul>
            )}
        </ResponsiveDialog>
    );
}
