import { create } from 'zustand';
import { Area, RestaurantTable, Reservation, TableWithStatus, TableVisualStatus } from '@/types/restaurant';
import { api } from '@/services/api';

interface RestaurantState {
  areas: Area[];
  tables: RestaurantTable[];
  reservations: Reservation[];
  selectedAreaId: string | null;
  loading: boolean;

  // Actions
  loadInitialData: () => Promise<void>;
  selectArea: (areaId: string) => void;
  refreshReservations: () => Promise<void>;
  createReservation: (data: Omit<Reservation, 'id'>) => Promise<Reservation>;
  updateReservationStatus: (id: string, status: Reservation['status']) => Promise<void>;
  markWalkIn: (tableId: string) => Promise<void>;
  releaseTable: (tableId: string) => Promise<void>;

  // Computed
  getTablesWithStatus: () => TableWithStatus[];
  getAreaTables: (areaId: string) => TableWithStatus[];
}

function computeVisualStatus(
  table: RestaurantTable,
  reservations: Reservation[],
  now: Date
): { status: TableVisualStatus; reservation?: Reservation } {
  const today = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const activeReservations = reservations.filter((r) => {
    if (r.date !== today) return false;
    if (r.status === 'cancelled' || r.status === 'completed' || r.status === 'no_show') return false;
    return r.tableIds.includes(table.id);
  });

  for (const res of activeReservations) {
    // Walk-in (duration 0) = occupied normal
    if (res.duration === 0) {
      return { status: 'occupied', reservation: res };
    }

    // Active reservation (current time is within range)
    if (res.startTime <= currentTime && res.endTime > currentTime) {
      // Check if VIP combined
      if (table.isVIP && res.tableIds.length > 1) {
        return { status: 'vip_combined', reservation: res };
      }
      return { status: 'reserved_active', reservation: res };
    }

    // Future reservation
    if (res.startTime > currentTime) {
      return { status: 'reserved_future', reservation: res };
    }
  }

  return { status: 'available' };
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  areas: [],
  tables: [],
  reservations: [],
  selectedAreaId: null,
  loading: false,

  loadInitialData: async () => {
    set({ loading: true });
    const [areas, tables, reservations] = await Promise.all([
      api.getAreas(),
      api.getTables(),
      api.getReservations(new Date().toISOString().split('T')[0]),
    ]);
    set({ areas, tables, reservations, selectedAreaId: areas[0]?.id ?? null, loading: false });
  },

  selectArea: (areaId) => set({ selectedAreaId: areaId }),

  refreshReservations: async () => {
    const reservations = await api.getReservations(new Date().toISOString().split('T')[0]);
    set({ reservations });
  },

  createReservation: async (data) => {
    const reservation = await api.createReservation(data);
    await get().refreshReservations();
    return reservation;
  },

  updateReservationStatus: async (id, status) => {
    await api.updateReservationStatus(id, status);
    await get().refreshReservations();
  },

  markWalkIn: async (tableId) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await api.createReservation({
      tableIds: [tableId],
      clientName: 'Walk-in',
      partySize: 0,
      date: today,
      startTime,
      endTime: '23:59',
      status: 'confirmed',
      duration: 0,
      notes: 'Sin reserva',
    });
    await get().refreshReservations();
  },

  releaseTable: async (tableId) => {
    const { reservations } = get();
    const today = new Date().toISOString().split('T')[0];
    const active = reservations.find(
      (r) =>
        r.tableIds.includes(tableId) &&
        r.date === today &&
        r.status !== 'cancelled' &&
        r.status !== 'completed' &&
        r.status !== 'no_show'
    );
    if (active) {
      await api.updateReservationStatus(active.id, 'completed');
      await get().refreshReservations();
    }
  },

  getTablesWithStatus: () => {
    const { tables, reservations } = get();
    const now = new Date();
    return tables.map((table) => {
      const { status, reservation } = computeVisualStatus(table, reservations, now);
      return { ...table, visualStatus: status, reservation };
    });
  },

  getAreaTables: (areaId) => {
    return get().getTablesWithStatus().filter((t) => t.areaId === areaId);
  },
}));
