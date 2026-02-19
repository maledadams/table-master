import { create } from 'zustand';
import { Area, RestaurantTable, Reservation, TableWithStatus, TableVisualStatus } from '@/types/restaurant';
import { api } from '@/services/client-api';
import { ApiError } from '@/services/errors';

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
  addTableToSelectedArea: () => Promise<RestaurantTable>;
  updateTablePosition: (
    tableId: string,
    x: number,
    y: number,
    options?: { canvasWidth?: number; canvasHeight?: number; isMergedView?: boolean }
  ) => void;
}

interface PendingPositionUpdate {
  x: number;
  y: number;
  canvasWidth?: number;
  canvasHeight?: number;
  isMergedView?: boolean;
}

const POSITION_SAVE_DEBOUNCE_MS = 400;
const positionSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPositionUpdates = new Map<string, PendingPositionUpdate>();
const reservationIdempotencyCache = new Map<string, { key: string; expiresAt: number }>();

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

function buildReservationFingerprint(data: Omit<Reservation, 'id'>): string {
  return [
    data.date,
    data.startTime,
    data.endTime,
    data.duration,
    data.partySize,
    data.clientName.trim().toLowerCase(),
    data.tableIds.slice().sort().join(','),
    data.notes.trim(),
  ].join('|');
}

function createRandomKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getReservationIdempotencyKey(data: Omit<Reservation, 'id'>): string {
  const now = Date.now();
  const fingerprint = buildReservationFingerprint(data);
  const cached = reservationIdempotencyCache.get(fingerprint);
  if (cached && cached.expiresAt > now) {
    return cached.key;
  }

  const key = `${createRandomKey()}-${hashString(fingerprint)}`;
  reservationIdempotencyCache.set(fingerprint, { key, expiresAt: now + 15_000 });

  for (const [cacheKey, value] of reservationIdempotencyCache.entries()) {
    if (value.expiresAt <= now) reservationIdempotencyCache.delete(cacheKey);
  }

  return key;
}

export function computeVisualStatus(
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
    const idempotencyKey = getReservationIdempotencyKey(data);
    const reservation = await api.createReservation(data, { idempotencyKey });
    await get().refreshReservations();
    return reservation;
  },

  updateReservationStatus: async (id, status) => {
    await api.updateReservationStatus(id, status);
    await get().refreshReservations();
  },

  markWalkIn: async (tableId) => {
    await api.createWalkIn({ tableId });
    await get().refreshReservations();
  },

  releaseTable: async (tableId) => {
    const result = await api.releaseTable(tableId);
    if (result.released) {
      await get().refreshReservations();
    }
  },

  addTableToSelectedArea: async () => {
    const selectedAreaId = get().selectedAreaId;
    if (!selectedAreaId) {
      throw new ApiError({
        status: 422,
        code: 'UNPROCESSABLE_ENTITY',
        message: 'Selecciona un area para agregar una mesa.',
      });
    }

    const created = await api.createTable({ areaId: selectedAreaId });
    set((state) => ({
      tables: [...state.tables, created],
    }));
    return created;
  },

  updateTablePosition: (tableId, x, y, options) => {
    pendingPositionUpdates.set(tableId, {
      x,
      y,
      canvasWidth: options?.canvasWidth,
      canvasHeight: options?.canvasHeight,
      isMergedView: options?.isMergedView,
    });

    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, x, y } : t
      ),
    }));

    const existingTimer = positionSaveTimers.get(tableId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      const pending = pendingPositionUpdates.get(tableId);
      if (!pending) return;

      const currentTable = get().tables.find((table) => table.id === tableId);
      if (!currentTable) return;

      try {
        const saved = await api.updateTablePosition({
          tableId,
          x: pending.x,
          y: pending.y,
          expectedVersion: currentTable.version,
          areaId: currentTable.areaId,
          canvasWidth: pending.canvasWidth,
          canvasHeight: pending.canvasHeight,
          isMergedView: pending.isMergedView,
        });

        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === saved.id ? { ...table, ...saved } : table
          ),
        }));
      } catch (error) {
        if (error instanceof ApiError && error.code === 'CONCURRENCY_CONFLICT') {
          const refreshedTables = await api.getTables();
          set({ tables: refreshedTables });
          return;
        }
        console.error('No se pudo persistir la posicion de la mesa', error);
      } finally {
        pendingPositionUpdates.delete(tableId);
        positionSaveTimers.delete(tableId);
      }
    }, POSITION_SAVE_DEBOUNCE_MS);

    positionSaveTimers.set(tableId, timer);
  },
}));
