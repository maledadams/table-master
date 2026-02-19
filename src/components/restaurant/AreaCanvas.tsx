import { useMemo } from 'react';
import { useRestaurantStore } from '@/store/restaurant-store';
import { TableComponent } from './TableComponent';
import { TableWithStatus } from '@/types/restaurant';

interface AreaCanvasProps {
  onTableClick: (table: TableWithStatus) => void;
}

export function AreaCanvas({ onTableClick }: AreaCanvasProps) {
  const { selectedAreaId, areas, getAreaTables } = useRestaurantStore();

  const area = areas.find((a) => a.id === selectedAreaId);
  const tables = useMemo(() => {
    if (!selectedAreaId) return [];
    return getAreaTables(selectedAreaId);
  }, [selectedAreaId, getAreaTables]);

  // Check VIP merged state
  const vipMergedReservation = useMemo(() => {
    if (area?.name !== 'VIP') return null;
    const tableA = tables.find((t) => t.mergeGroup === 'VIP_AB' && t.name === 'Cuadrada A');
    const tableB = tables.find((t) => t.mergeGroup === 'VIP_AB' && t.name === 'Cuadrada B');
    if (!tableA || !tableB) return null;

    // Check if there's an active combined reservation
    if (
      tableA.reservation &&
      tableB.reservation &&
      tableA.reservation.id === tableB.reservation.id
    ) {
      return tableA; // Return either, they share the same reservation
    }
    return null;
  }, [tables, area]);

  if (!area) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Selecciona un área
      </div>
    );
  }

  const renderVIPLayout = () => {
    const roundTable = tables.find((t) => t.type === 'circular');
    const squareA = tables.find((t) => t.name === 'Cuadrada A');
    const squareB = tables.find((t) => t.name === 'Cuadrada B');

    return (
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Round table on top */}
        {roundTable && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mesa Redonda</span>
            <TableComponent table={roundTable} onClick={onTableClick} />
          </div>
        )}

        {/* Square tables - merged or separate */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {vipMergedReservation ? 'A + B Combinadas' : 'Mesas Cuadradas'}
          </span>
          {vipMergedReservation ? (
            <TableComponent
              table={vipMergedReservation}
              onClick={onTableClick}
              isMergedView
            />
          ) : (
            <div className="flex gap-3">
              {squareA && <TableComponent table={squareA} onClick={onTableClick} />}
              {squareB && <TableComponent table={squareB} onClick={onTableClick} />}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStandardLayout = () => {
    // Group by capacity for visual rows
    const byCapacity: Record<number, TableWithStatus[]> = {};
    tables.forEach((t) => {
      if (!byCapacity[t.capacity]) byCapacity[t.capacity] = [];
      byCapacity[t.capacity].push(t);
    });

    const capacities = Object.keys(byCapacity).map(Number).sort((a, b) => a - b);

    return (
      <div className="flex flex-col gap-6 p-6">
        {capacities.map((cap) => (
          <div key={cap}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {cap} personas
            </div>
            <div className="flex flex-wrap gap-3">
              {byCapacity[cap].map((table) => (
                <TableComponent key={table.id} table={table} onClick={onTableClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-3 border-b border-border flex items-center gap-3">
        <h2 className="text-lg font-bold text-foreground">{area.name}</h2>
        <span className="text-xs text-muted-foreground">
          {tables.length} mesas · Máx {area.maxTables}
        </span>
      </div>
      <div className="min-h-[400px] flex items-start justify-center">
        {area.name === 'VIP' ? renderVIPLayout() : renderStandardLayout()}
      </div>
    </div>
  );
}
