import { useMemo, useState, useRef, useCallback } from 'react';
import { useRestaurantStore, computeTablesWithStatus, computeVisualStatus } from '@/store/restaurant-store';
import { TableComponent } from './TableComponent';
import { TableWithStatus } from '@/types/restaurant';
import { cn } from '@/lib/utils';

interface AreaCanvasProps {
  onTableClick: (table: TableWithStatus) => void;
  currentTime: Date;
}

export function AreaCanvas({ onTableClick, currentTime }: AreaCanvasProps) {
  const selectedAreaId = useRestaurantStore((s) => s.selectedAreaId);
  const areas = useRestaurantStore((s) => s.areas);
  const rawTables = useRestaurantStore((s) => s.tables);
  const reservations = useRestaurantStore((s) => s.reservations);
  const updateTablePosition = useRestaurantStore((s) => s.updateTablePosition);

  const area = areas.find((a) => a.id === selectedAreaId);

  const currentMinute = `${currentTime.getHours()}:${currentTime.getMinutes()}`;

  const tables = useMemo(() => {
    if (!selectedAreaId) return [];
    const areaTables = rawTables.filter((t) => t.areaId === selectedAreaId);
    return computeTablesWithStatus(areaTables, reservations, currentTime);
  }, [selectedAreaId, rawTables, reservations, currentMinute]);

  // VIP merged reservation detection
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

  // Drag state
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
        const dx = ((dragCurrentClient.cx - dragStartClient.cx) / rect.width) * 100;
        const dy = ((dragCurrentClient.cy - dragStartClient.cy) / rect.height) * 100;
        const newX = Math.max(2, Math.min(88, table.x + dx));
        const newY = Math.max(2, Math.min(85, table.y + dy));
        updateTablePosition(dragId, newX, newY);
      }
    } else {
      const table = tables.find((t) => t.id === dragId);
      if (table) onTableClick(table);
    }

    setDragId(null);
    setDragStartClient(null);
    setDragCurrentClient(null);
  }, [dragId, dragStartClient, dragCurrentClient, tables, updateTablePosition, onTableClick]);

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
        Selecciona un área
      </div>
    );
  }

  // Build display list: if VIP A+B are merged, show one combined table and hide B
  const displayTables = (() => {
    if (!vipMergedReservation) return tables;
    return tables.filter((t) => t.id !== vipMergedReservation.tableB.id);
  })();

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-6 py-3 border-b border-border flex items-center gap-3">
        <h2 className="text-lg font-bold text-foreground">{area.name}</h2>
        <span className="text-xs text-muted-foreground">
          {tables.length} mesas · Máx {area.maxTables}
        </span>
      </div>
      <div
        ref={canvasRef}
        className="flex-1 relative min-h-[400px] select-none"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {displayTables.map((table) => {
          const offset = getDragOffset(table.id);
          const isMerged = vipMergedReservation?.tableA.id === table.id;
          const displayTable = isMerged
            ? ({ ...table, name: 'Cuadrada A + B' } as TableWithStatus)
            : table;

          return (
            <div
              key={table.id}
              className={cn(
                'absolute',
                dragId === table.id ? 'z-50 cursor-grabbing' : 'cursor-grab'
              )}
              style={{
                left: `${table.x + offset.dx}%`,
                top: `${table.y + offset.dy}%`,
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
