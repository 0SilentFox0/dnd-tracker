'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useCommittedName } from './useCommittedName';
import { useRemoveMap } from './useRemoveMap';
import type { useWorldEditor } from './useWorldEditor';
import { useWorldMapUpload } from './useWorldMapUpload';

import { REVEAL_RADIUS_RANGE } from '@/lib/constants/world';
import { useConfirm, useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';
import { imageSizeOf } from '@/lib/utils/common/image-decode';
import type { WorldMapDetail, WorldMapSummary } from '@/types/world';

const ASPECT_TOLERANCE = 0.01;

interface Options {
    campaignId: string;
    detail: WorldMapDetail;
    maps: WorldMapSummary[];
    editor: ReturnType<typeof useWorldEditor>;
    openMap(id: string | null): void;
}

export function useMapFields({
    campaignId,
    detail,
    maps,
    editor,
    openMap,
}: Options) {
    const { map } = detail;

    const confirm = useConfirm();

    const t = useTranslations('world');

    const notify = useNotify();

    const { upload, discard } = useWorldMapUpload(campaignId);

    const [radius, setRadius] = useState(map.revealRadius);

    const lastRadius = useRef(map.revealRadius);

    const children = maps.filter((m) => m.parentMapId === map.id);

    const fill =
        ((radius - REVEAL_RADIUS_RANGE.min) /
            (REVEAL_RADIUS_RANGE.max - REVEAL_RADIUS_RANGE.min)) *
        100;

    const save = (
        data: Parameters<typeof editor.map.update.mutateOk>[0]['data']
    ) => editor.map.update.mutateOk({ id: map.id, data });

    const { name, setName, commitName } = useCommittedName(map.name, (next) =>
        save({ name: next })
    );

    const commitRadius = () => {
        if (radius === lastRadius.current) return;

        lastRadius.current = radius;
        void save({ revealRadius: radius });
    };

    const replaceImage = async (file: File) => {
        const size = await imageSizeOf(file).catch(() => null);

        const changed = size
            ? Math.abs(size.width / size.height - map.width / map.height) >
              ASPECT_TOLERANCE
            : false;

        const ok = await confirm({
            title: t('replace.title'),
            description: changed
                ? t('replace.aspectChanged')
                : t('replace.same'),
            confirmLabel: t('replace.confirm'),
        });

        if (!ok) return;

        let image;

        try {
            image = await upload(file);
        } catch (err) {
            void notify(errorMessage(err, t('errors.uploadFailed')));

            return;
        }

        if (!(await save({ ...image }))) void discard(image.imageUrl);
    };

    const removeMap = useRemoveMap(maps, editor);

    const remove = async () => {
        if (await removeMap(map)) openMap(map.parentMapId);
    };

    return {
        map,
        name,
        setName,
        commitName,
        radius,
        setRadius,
        commitRadius,
        fill,
        children,
        save,
        replaceImage,
        remove,
    };
}
