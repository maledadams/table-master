import { RestaurantTable } from '@/types/restaurant';
import { getTableDimensions } from '@/lib/table-dimensions';

export interface ZoneInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_ZONE_INSET: ZoneInset = { top: 10, right: 8, bottom: 12, left: 8 };
export const zoneInsetByAreaId: Record<string, ZoneInset> = {
  'area-terraza': { top: 7, right: 7, bottom: 12, left: 7 },
  'area-patio': { top: 10, right: 9, bottom: 13, left: 9 },
  'area-lobby': { top: 11, right: 11, bottom: 14, left: 11 },
  'area-bar': { top: 12, right: 10, bottom: 15, left: 10 },
  'area-vip': { top: 9, right: 14, bottom: 13, left: 14 },
};

const ROOT_REM_PX = 16;

function clampToRange(value: number, min: number, max: number): number {
  if (max <= min) return min;
  return Math.max(min, Math.min(max, value));
}

export function clampTablePositionToArea(params: {
  table: Pick<RestaurantTable, 'type' | 'capacity'>;
  areaId?: string;
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  isMergedView?: boolean;
}): { x: number; y: number } {
  const { table, areaId, x, y, canvasWidth, canvasHeight, isMergedView } = params;
  const inset = (areaId && zoneInsetByAreaId[areaId]) ?? DEFAULT_ZONE_INSET;
  const dims = getTableDimensions(table, isMergedView);

  const safeWidth = Math.max(1, canvasWidth);
  const safeHeight = Math.max(1, canvasHeight);
  const tableWidthPct = ((dims.widthRem * ROOT_REM_PX) / safeWidth) * 100;
  const tableHeightPct = ((dims.heightRem * ROOT_REM_PX) / safeHeight) * 100;

  const minX = inset.left;
  const maxX = 100 - inset.right - tableWidthPct;
  const minY = inset.top;
  const maxY = 100 - inset.bottom - tableHeightPct;

  return {
    x: clampToRange(x, minX, maxX),
    y: clampToRange(y, minY, maxY),
  };
}
