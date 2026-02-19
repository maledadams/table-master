import { useMemo, useState, useRef, useCallback } from 'react';
import { useRestaurantStore, computeTablesWithStatus } from '@/store/restaurant-store';
import { TableComponent } from './TableComponent';
import { TableWithStatus } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import { getTableDimensions } from './table-dimensions';

interface AreaCanvasProps {
  onTableClick: (table: TableWithStatus) => void;
  currentTime: Date;
}

const areaThemeClassById: Record<string, string> = {
  'area-terraza': 'area-theme-area-terraza',
  'area-patio': 'area-theme-area-patio',
  'area-lobby': 'area-theme-area-lobby',
  'area-bar': 'area-theme-area-bar',
  'area-vip': 'area-theme-area-vip',
};

interface ZoneInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const DEFAULT_ZONE_INSET: ZoneInset = { top: 10, right: 8, bottom: 12, left: 8 };
const zoneInsetByAreaId: Record<string, ZoneInset> = {
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

function clampTableToZone(
  table: TableWithStatus,
  areaId: string | undefined,
  canvasRect: DOMRect,
  x: number,
  y: number,
  isMergedView?: boolean
): { x: number; y: number } {
  const inset = (areaId && zoneInsetByAreaId[areaId]) ?? DEFAULT_ZONE_INSET;
  const dims = getTableDimensions(table, isMergedView);
  const tableWidthPct = ((dims.widthRem * ROOT_REM_PX) / canvasRect.width) * 100;
  const tableHeightPct = ((dims.heightRem * ROOT_REM_PX) / canvasRect.height) * 100;

  const minX = inset.left;
  const maxX = 100 - inset.right - tableWidthPct;
  const minY = inset.top;
  const maxY = 100 - inset.bottom - tableHeightPct;

  return {
    x: clampToRange(x, minX, maxX),
    y: clampToRange(y, minY, maxY),
  };
}

export function AreaCanvas({ onTableClick, currentTime }: AreaCanvasProps) {
  const selectedAreaId = useRestaurantStore((s) => s.selectedAreaId);
  const areas = useRestaurantStore((s) => s.areas);
  const rawTables = useRestaurantStore((s) => s.tables);
  const reservations = useRestaurantStore((s) => s.reservations);
  const updateTablePosition = useRestaurantStore((s) => s.updateTablePosition);

  const area = areas.find((a) => a.id === selectedAreaId);
  const areaThemeClass = area ? areaThemeClassById[area.id] : '';

  const currentMinute = `${currentTime.getHours()}:${currentTime.getMinutes()}`;

  const tables = useMemo(() => {
    if (!selectedAreaId) return [];
    const areaTables = rawTables.filter((t) => t.areaId === selectedAreaId);
    return computeTablesWithStatus(areaTables, reservations, currentTime);
  }, [selectedAreaId, rawTables, reservations, currentMinute]);

  const vipMergedReservation = useMemo(() => {
    if (area?.name !== 'Salones VIP') return null;
    const tableA = tables.find((t) => t.mergeGroup === 'VIP_AB' && t.name === 'Cuadrada A');
    const tableB = tables.find((t) => t.mergeGroup === 'VIP_AB' && t.name === 'Cuadrada B');
    if (!tableA || !tableB) return null;
    if (
      tableA.reservation &&
      tableB.reservation &&
      tableA.reservation.id === tableB.reservation.id
    ) {
      return { tableA, tableB };
    }
    return null;
  }, [tables, area]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragStartClient, setDragStartClient] = useState<{ cx: number; cy: number } | null>(null);
  const [dragCurrentClient, setDragCurrentClient] = useState<{ cx: number; cy: number } | null>(null);
  const didDrag = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent, tableId: string) => {
    setDragId(tableId);
    setDragStartClient({ cx: e.clientX, cy: e.clientY });
    setDragCurrentClient({ cx: e.clientX, cy: e.clientY });
    didDrag.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragId || !dragStartClient) return;
    const dx = e.clientX - dragStartClient.cx;
    const dy = e.clientY - dragStartClient.cy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      didDrag.current = true;
    }
    setDragCurrentClient({ cx: e.clientX, cy: e.clientY });
  }, [dragId, dragStartClient]);

  const handlePointerUp = useCallback(() => {
    if (!dragId) return;

    if (didDrag.current && canvasRef.current && dragStartClient && dragCurrentClient) {
      const rect = canvasRef.current.getBoundingClientRect();
      const table = tables.find((t) => t.id === dragId);
      if (table) {
        const isMergedDrag = vipMergedReservation?.tableA.id === table.id;
        const dx = ((dragCurrentClient.cx - dragStartClient.cx) / rect.width) * 100;
        const dy = ((dragCurrentClient.cy - dragStartClient.cy) / rect.height) * 100;
        const next = clampTableToZone(
          table,
          area?.id,
          rect,
          table.x + dx,
          table.y + dy,
          isMergedDrag
        );
        updateTablePosition(dragId, next.x, next.y);
      }
    } else {
      const table = tables.find((t) => t.id === dragId);
      if (table) onTableClick(table);
    }

    setDragId(null);
    setDragStartClient(null);
    setDragCurrentClient(null);
  }, [
    dragId,
    dragStartClient,
    dragCurrentClient,
    tables,
    updateTablePosition,
    onTableClick,
    area?.id,
    vipMergedReservation,
  ]);

  const getDragOffset = (tableId: string) => {
    if (dragId !== tableId || !dragStartClient || !dragCurrentClient || !canvasRef.current) {
      return { dx: 0, dy: 0 };
    }
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      dx: ((dragCurrentClient.cx - dragStartClient.cx) / rect.width) * 100,
      dy: ((dragCurrentClient.cy - dragStartClient.cy) / rect.height) * 100,
    };
  };

  if (!area) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Selecciona un area
      </div>
    );
  }

  const displayTables = (() => {
    if (!vipMergedReservation) return tables;
    return tables.filter((t) => t.id !== vipMergedReservation.tableB.id);
  })();
  const canvasRect = canvasRef.current?.getBoundingClientRect();

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">{area.name}</h2>
        <span className="text-xs text-muted-foreground">
          {tables.length} mesas - Max {area.maxTables}
        </span>
      </div>
      <div
        ref={canvasRef}
        className={cn('flex-1 relative min-h-[400px] select-none area-canvas', areaThemeClass)}
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="area-canvas-texture" aria-hidden />
        <div className="area-canvas-zone" aria-hidden />

        {displayTables.map((table) => {
          const offset = getDragOffset(table.id);
          const isMerged = vipMergedReservation?.tableA.id === table.id;
          const baseX = table.x + offset.dx;
          const baseY = table.y + offset.dy;
          const clampedPos = canvasRect
            ? clampTableToZone(table, area.id, canvasRect, baseX, baseY, isMerged)
            : { x: baseX, y: baseY };
          const displayTable = isMerged
            ? ({ ...table, name: 'Cuadrada A + B' } as TableWithStatus)
            : table;

          return (
            <div
              key={table.id}
              className={cn(
                'absolute z-10',
                dragId === table.id ? 'z-50 cursor-grabbing' : 'cursor-grab'
              )}
              style={{
                left: `${clampedPos.x}%`,
                top: `${clampedPos.y}%`,
                transition: dragId === table.id ? 'none' : 'left 0.2s ease, top 0.2s ease',
              }}
              onPointerDown={(e) => handlePointerDown(e, table.id)}
            >
              <TableComponent
                table={displayTable}
                onClick={() => {}}
                isMergedView={isMerged}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
