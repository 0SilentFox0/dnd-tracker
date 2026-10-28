import { type LucideIcon, MapPin, Pentagon } from "lucide-react";

import { MARKER_ICON } from "@/components/world/marker-icons";
import { WORLD_MARKER_ICONS } from "@/lib/constants/world";
import type { WorldMarker } from "@/types/world";

export const ICON_OPTIONS = Object.entries(WORLD_MARKER_ICONS).map(([value, { label }]) => ({ value, label, Icon: MARKER_ICON[value] ?? MapPin }));

export const markerIcon = (marker: WorldMarker): LucideIcon => (marker.icon && MARKER_ICON[marker.icon]) || (marker.kind === "zone" ? Pentagon : MapPin);
