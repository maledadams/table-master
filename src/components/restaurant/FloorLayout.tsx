import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useRestaurantStore, computeTablesWithStatus, computeVisualStatus } from '@/store/restaurant-store';
import { AreaSidebar } from './AreaSidebar';
import { AreaCanvas } from './AreaCanvas';
import { TableActionModal } from './TableActionModal';
import { ReservationModal } from './ReservationModal';
import { ReservationListPanel } from './ReservationListPanel';
import { TableWithStatus } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { RefreshCw, CalendarDays, Unlock } from 'lucide-react';

export function FloorLayout() {
  const loadInitialData = useRestaurantStore((s) => s.loadInitialData);
  const refreshReservations = useRestaurantStore((s) => s.refreshReservations);
  const releaseTable = useRestaurantStore((s) => s.releaseTable);
  const markWalkIn = useRestaurantStore((s) => s.markWalkIn);
  const rawTables = useRestaurantStore((s) => s.tables);
  const reservations = useRestaurantStore((s) => s.reservations);

  const [selectedTable, setSelectedTable] = useState<TableWithStatus | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReservationList, setShowReservationList] = useState(false);
  const [combineMode, setCombineMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshReservations, 30000);
    return () => clearInterval(interval);
  }, [refreshReservations]);

  const canCombine = useMemo(() => {
    if (!selectedTable?.canMerge || !selectedTable.mergeGroup) return false;
    const partner = rawTables.find(
      (t) => t.mergeGroup === selectedTable.mergeGroup && t.id !== selectedTable.id
    );
    if (!partner) return false;
    const { status } = computeVisualStatus(partner, reservations, currentTime);
    return status === 'available';
  }, [selectedTable, rawTables, reservations, currentTime]);

  const combinedTableIds = useMemo(() => {
    if (!selectedTable?.canMerge || !selectedTable.mergeGroup) return undefined;
    const partner = rawTables.find(
      (t) => t.mergeGroup === selectedTable.mergeGroup && t.id !== selectedTable.id
    );
    return partner ? [selectedTable.id, partner.id] : undefined;
  }, [selectedTable, rawTables]);

  const handleTableClick = useCallback((table: TableWithStatus) => {
    setSelectedTable(table);
    setCombineMode(false);
    if (table.visualStatus === 'available') {
      setShowActionModal(true);
    }
  }, []);

  const handleReserve = () => {
    setCombineMode(false);
    setShowActionModal(false);
    setShowReservationModal(true);
  };

  const handleCombine = () => {
    setCombineMode(true);
    setShowActionModal(false);
    setShowReservationModal(true);
  };

  const handleWalkIn = async () => {
    if (!selectedTable) return;
    await markWalkIn(selectedTable.id);
    setShowActionModal(false);
    setSelectedTable(null);
  };

  const handleRelease = async (tableId: string) => {
    await releaseTable(tableId);
  };

  const dateStr = currentTime.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-24 cozy-light-panel border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-base font-bold cozy-light-text tracking-tight">FLOOR MANAGER</h1>
          <div className="h-5 w-px bg-[hsl(var(--panel-light-border))]" />
          <span className="text-xs cozy-light-muted capitalize">{dateStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-base text-primary font-bold">{timeStr}</span>
          <div className="h-5 w-px bg-[hsl(var(--panel-light-border))]" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReservationList(true)}
            className="text-xs cozy-light-text gap-2 px-4 hover:bg-[hsl(var(--panel-light-border))]/50"
          >
            <CalendarDays className="w-5 h-5" />
            Reservas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshReservations}
            className="text-xs cozy-light-muted gap-2 px-4 hover:bg-[hsl(var(--panel-light-border))]/45 hover:text-[hsl(var(--panel-light-foreground))]"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <AreaSidebar currentTime={currentTime} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AreaCanvas onTableClick={handleTableClick} currentTime={currentTime} />
          <OccupiedTableBar onRelease={handleRelease} />
        </div>
      </div>

      {selectedTable && (
        <>
          <TableActionModal
            open={showActionModal}
            onClose={() => {
              setShowActionModal(false);
              setSelectedTable(null);
            }}
            table={selectedTable}
            onReserve={handleReserve}
            onWalkIn={handleWalkIn}
            canCombine={canCombine}
            onCombine={handleCombine}
          />
          <ReservationModal
            open={showReservationModal}
            onClose={() => {
              setShowReservationModal(false);
              setSelectedTable(null);
              setCombineMode(false);
            }}
            table={selectedTable}
            combinedTableIds={combineMode ? combinedTableIds : undefined}
          />
        </>
      )}

      <ReservationListPanel
        open={showReservationList}
        onClose={() => setShowReservationList(false)}
      />
    </div>
  );
}

function OccupiedTableBar({ onRelease }: { onRelease: (tableId: string) => void }) {
  const selectedAreaId = useRestaurantStore((s) => s.selectedAreaId);
  const rawTables = useRestaurantStore((s) => s.tables);
  const reservations = useRestaurantStore((s) => s.reservations);
  const areas = useRestaurantStore((s) => s.areas);

  const area = areas.find((a) => a.id === selectedAreaId);

  const releasable = useMemo(() => {
    const areaTables = selectedAreaId
      ? rawTables.filter((t) => t.areaId === selectedAreaId)
      : rawTables;
    const all = computeTablesWithStatus(areaTables, reservations, new Date());
    return all.filter(
      (t) =>
        t.visualStatus === 'occupied' ||
        t.visualStatus === 'reserved_active' ||
        t.visualStatus === 'vip_combined'
    );
  }, [rawTables, reservations, selectedAreaId]);

  if (releasable.length === 0) return null;

  return (
    <div className="border-t cozy-light-panel px-5 py-4 shrink-0">
      <div className="text-xs uppercase tracking-widest cozy-light-muted mb-1.5">
        Mesas activas - {area?.name ?? 'Todas'} - Click para liberar
      </div>
      <div className="flex gap-2 flex-wrap">
        {releasable.map((t) => (
          <Button
            key={t.id}
            variant="ghost"
            size="sm"
            onClick={() => onRelease(t.id)}
            className={cn(
              'h-14 px-4 text-xs gap-2 cozy-light-text border border-[hsl(var(--panel-light-border))]/70',
              t.visualStatus === 'occupied'
                ? 'bg-[hsl(var(--panel-light))]/80 hover:bg-[hsl(var(--panel-light-border))]/40'
                : 'bg-[hsl(var(--destructive))]/20 hover:bg-[hsl(var(--destructive))]/30'
            )}
          >
            <Unlock className="w-5 h-5" />
            {t.name}
            {t.reservation?.clientName && t.reservation.clientName !== 'Walk-in' && (
              <span className="opacity-60 ml-1">({t.reservation.clientName})</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
