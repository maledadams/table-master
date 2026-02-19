import { useRestaurantStore } from '@/store/restaurant-store';
import { Area } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import { MapPin, Wine, Trees, Building2, Armchair } from 'lucide-react';

const areaIcons: Record<string, React.ElementType> = {
  Terraza: Trees,
  Patio: MapPin,
  Lobby: Building2,
  Bar: Wine,
  VIP: Armchair,
};

export function AreaSidebar() {
  const { areas, selectedAreaId, selectArea, reservations, tables } = useRestaurantStore();

  const getAreaStats = (area: Area) => {
    const areaTables = tables.filter((t) => t.areaId === area.id);
    const today = new Date().toISOString().split('T')[0];
    const activeRes = reservations.filter(
      (r) =>
        r.date === today &&
        r.status !== 'cancelled' &&
        r.status !== 'completed' &&
        r.status !== 'no_show' &&
        r.tableIds.some((id) => areaTables.some((t) => t.id === id))
    );
    return { total: areaTables.length, occupied: activeRes.length };
  };

  return (
    <div className="w-48 bg-card border-r border-border flex flex-col shrink-0">
      <div className="px-3 py-3 border-b border-border">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Áreas</h2>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {areas.map((area) => {
          const isActive = area.id === selectedAreaId;
          const Icon = areaIcons[area.name] || MapPin;
          const stats = getAreaStats(area);
          return (
            <button
              key={area.id}
              onClick={() => selectArea(area.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 text-left',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{area.name}</div>
                <div className="text-[10px] opacity-60">
                  {stats.occupied}/{stats.total} mesas
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-auto p-3 border-t border-border space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Estado</div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="w-3 h-3 rounded table-available" />
          Disponible
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="w-3 h-3 rounded table-occupied" />
          Ocupada
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="w-3 h-3 rounded table-reserved-future" />
          Reserva futura
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="w-3 h-3 rounded table-reserved-active" />
          Reserva activa
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="w-3 h-3 rounded border-2" style={{ borderColor: 'hsl(42 75% 55%)' }} />
          VIP
        </div>
      </div>
    </div>
  );
}
