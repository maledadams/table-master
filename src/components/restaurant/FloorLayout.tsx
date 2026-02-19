import { useState, useEffect, useCallback } from 'react';
import { useRestaurantStore } from '@/store/restaurant-store';
import { AreaSidebar } from './AreaSidebar';
import { AreaCanvas } from './AreaCanvas';
import { TableActionModal } from './TableActionModal';
import { ReservationModal } from './ReservationModal';
import { ReservationListPanel } from './ReservationListPanel';
import { TableWithStatus } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { RefreshCw, CalendarDays, Unlock } from 'lucide-react';

export function FloorLayout() {
  const { loadInitialData, refreshReservations, releaseTable } = useRestaurantStore();

  const [selectedTable, setSelectedTable] = useState<TableWithStatus | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReservationList, setShowReservationList] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh reservations every 30s
  useEffect(() => {
    const interval = setInterval(refreshReservations, 30000);
    return () => clearInterval(interval);
  }, [refreshReservations]);

  const handleTableClick = useCallback((table: TableWithStatus) => {
    setSelectedTable(table);

    if (table.visualStatus === 'available') {
      setShowActionModal(true);
    } else if (table.visualStatus === 'occupied') {
      // For occupied tables, offer to release
      setShowActionModal(false);
      setShowReservationModal(false);
    }
    // For reserved tables, just show info via selection
  }, []);

  const handleReserve = () => {
    setShowActionModal(false);
    setShowReservationModal(true);
  };

  const { markWalkIn } = useRestaurantStore();

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
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-foreground tracking-tight">FLOOR MANAGER</h1>
          <div className="h-5 w-px bg-border" />
          <span className="text-xs text-muted-foreground capitalize">{dateStr}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-primary font-bold">{timeStr}</span>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReservationList(true)}
            className="text-xs text-foreground gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Reservas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshReservations}
            className="text-xs text-muted-foreground gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <AreaSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AreaCanvas onTableClick={handleTableClick} />

          {/* Quick release bar for occupied tables */}
          <OccupiedTableBar onRelease={handleRelease} />
        </div>
      </div>

      {/* Modals */}
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
          />
          <ReservationModal
            open={showReservationModal}
            onClose={() => {
              setShowReservationModal(false);
              setSelectedTable(null);
            }}
            table={selectedTable}
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
  const tables = useRestaurantStore((s) => s.getTablesWithStatus());
  const occupied = tables.filter((t) => t.visualStatus === 'occupied');

  if (occupied.length === 0) return null;

  return (
    <div className="border-t border-border bg-card px-4 py-2 shrink-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        Mesas ocupadas sin reserva
      </div>
      <div className="flex gap-2 flex-wrap">
        {occupied.map((t) => (
          <Button
            key={t.id}
            variant="ghost"
            size="sm"
            onClick={() => onRelease(t.id)}
            className="h-7 px-2 text-xs gap-1 bg-secondary hover:bg-accent text-foreground"
          >
            <Unlock className="w-3 h-3" />
            {t.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
