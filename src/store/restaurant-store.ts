import { create } from 'zustand';
import { Area, RestaurantTable, Reservation, TableWithStatus, TableVisualStatus } from '@/types/restaurant';
import { api } from '@/services/api';
import { mockAreas, mockReservations, mockTables } from '@/data/mock-data';
import { getLocalDateISO } from '@/lib/date';

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
  updateTablePosition: (
    tableId: string,
    x: number,
    y: number,
    _meta?: { canvasWidth?: number; canvasHeight?: number; isMergedView?: boolean }
  ) => void;
}

export function computeVisualStatus(
  table: RestaurantTable,
  reservations: Reservation[],
  now: Date
): { status: TableVisualStatus; reservation?: Reservation } {
  const today = getLocalDateISO(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const activeReservations = reservations.filter((r) => {
    if (r.date !== today) return false;
    if (r.status === 'cancelled' || r.status === 'completed' || r.status === 'no_show') return false;
    return r.tableIds.includes(table.id);
  });

  for (const res of activeReservations) {
    if (res.duration === 0) {
      return { status: 'occupied', reservation: res };
    }
    if (res.startTime <= currentTime && res.endTime > currentTime) {
      if (table.isVIP && res.tableIds.length > 1) {
        return { status: 'vip_combined', reservation: res };
      }
      return { status: 'reserved_active', reservation: res };
    }
    if (res.startTime > currentTime) {
      return { status: 'reserved_future', reservation: res };
    }
  }

  return { status: 'available' };
}

export function computeTablesWithStatus(
  tables: RestaurantTable[],
  reservations: Reservation[],
  now: Date
): TableWithStatus[] {
  return tables.map((table) => {
    const { status, reservation } = computeVisualStatus(table, reservations, now);
    return { ...table, visualStatus: status, reservation };
  });
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  areas: [],
  tables: [],
  reservations: [],
  selectedAreaId: null,
  loading: false,

  loadInitialData: async () => {
    set({ loading: true });
    try {
      const [areas, tables, reservations] = await Promise.all([
        api.getAreas(),
        api.getTables(),
        api.getReservations(),
      ]);

      const hasCoreData = areas.length > 0 && tables.length > 0;
      const nextAreas = hasCoreData ? areas : mockAreas;
      const nextTables = hasCoreData ? tables : mockTables;
      const nextReservations = hasCoreData ? reservations : mockReservations;

      set({
        areas: nextAreas,
        tables: nextTables,
        reservations: nextReservations,
        selectedAreaId: nextAreas[0]?.id ?? null,
        loading: false,
      });
    } catch {
      set({
        areas: mockAreas,
        tables: mockTables,
        reservations: mockReservations,
        selectedAreaId: mockAreas[0]?.id ?? null,
        loading: false,
      });
    }
  },

  selectArea: (areaId) => set({ selectedAreaId: areaId }),

  refreshReservations: async () => {
    const reservations = await api.getReservations();
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
    const today = getLocalDateISO();
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
    const today = getLocalDateISO();
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

  updateTablePosition: (tableId, x, y) => {
    set((state) => ({
      tables: state.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              x,
              y,
            }
          : table
      ),
    }));
  },
}));
