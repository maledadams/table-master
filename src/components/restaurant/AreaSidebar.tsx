import { useRestaurantStore, computeTablesWithStatus } from '@/store/restaurant-store';
import { Area } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';
import { MapPin, Wine, Trees, Building2, Armchair } from 'lucide-react';

const areaIcons: Record<string, ElementType> = {
  Terraza: Trees,
  Patio: MapPin,
  Lobby: Building2,
  Bar: Wine,
  'Salones VIP': Armchair,
};

interface AreaSidebarProps {
  currentTime: Date;
}

export function AreaSidebar({ currentTime }: AreaSidebarProps) {
  const { areas, selectedAreaId, selectArea, reservations, tables } = useRestaurantStore();

  const getAreaStats = (area: Area) => {
    const areaTables = tables.filter((t) => t.areaId === area.id);
    const withStatus = computeTablesWithStatus(areaTables, reservations, currentTime);
    const occupied = withStatus.filter(
      (t) =>
        t.visualStatus === 'occupied' ||
        t.visualStatus === 'reserved_active' ||
        t.visualStatus === 'vip_combined'
    ).length;
    return { total: areaTables.length, available: areaTables.length - occupied };
  };

  return (
    <div className="w-[24rem] cozy-light-panel border-r flex flex-col shrink-0">
      <div className="px-3 py-3 border-b border-[hsl(var(--panel-light-border))]">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest cozy-light-muted">Areas</h2>
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
                'flex items-center gap-4 px-4 py-4 rounded-lg transition-all duration-150 text-left',
                isActive
                  ? 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--panel-light-foreground))] border border-[hsl(var(--primary))]/45'
                  : 'cozy-light-muted hover:bg-[hsl(var(--panel-light-border))]/25 hover:text-[hsl(var(--panel-light-foreground))] border border-transparent'
              )}
            >
              <Icon className="w-6 h-6 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[2.625rem] leading-[1.05] font-semibold">{area.name}</div>
                <div className="text-[1.25rem] opacity-60 mt-1">
                  {stats.available}/{stats.total} mesas
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-3 border-t border-[hsl(var(--panel-light-border))] space-y-1.5">
        <div className="font-display text-[1.25rem] font-bold uppercase tracking-widest cozy-light-muted mb-2">Estado</div>
        <div className="flex items-center gap-2 text-[1.25rem] cozy-light-muted">
          <div className="w-5 h-5 rounded table-available" />
          Disponible
        </div>
        <div className="flex items-center gap-2 text-[1.25rem] cozy-light-muted">
          <div className="w-5 h-5 rounded table-occupied" />
          Ocupada
        </div>
        <div className="flex items-center gap-2 text-[1.25rem] cozy-light-muted">
          <div className="w-5 h-5 rounded table-reserved-future" />
          Reserva futura
        </div>
        <div className="flex items-center gap-2 text-[1.25rem] cozy-light-muted">
          <div className="w-5 h-5 rounded table-reserved-active" />
          Reserva activa
        </div>
        <div className="flex items-center gap-2 text-[1.25rem] cozy-light-muted">
          <div className="w-5 h-5 rounded border-2" style={{ borderColor: 'hsl(42 75% 55%)' }} />
          VIP
        </div>
      </div>
    </div>
  );
}
