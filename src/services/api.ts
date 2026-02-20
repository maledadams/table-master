import { Area, RestaurantTable, Reservation, ReservationStatus, AvailabilityResponse } from '@/types/restaurant';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function fallbackPosition(seed: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const x = 10 + (hash % 70);
  const y = 12 + ((Math.floor(hash / 97) % 65));
  return { x, y };
}

function normalizeStatus(value: unknown): ReservationStatus {
  const raw = String(value ?? '').toLowerCase();
  const mapped: Record<string, ReservationStatus> = {
    pending: 'pending',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    completed: 'completed',
    'no_show': 'no_show',
    'no-show': 'no_show',
    noshow: 'no_show',
  };
  return mapped[raw] ?? 'confirmed';
}

function normalizeDate(value: unknown): string {
  const date = String(value ?? '');
  if (!date) return new Date().toISOString().split('T')[0];
  return date.includes('T') ? date.split('T')[0] : date;
}

function normalizeTime(value: unknown): string {
  const raw = String(value ?? '00:00');
  const [h = '00', m = '00'] = raw.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function computeEndTime(startTime: string, durationMins: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const baseMins = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  const total = baseMins + Math.max(0, durationMins);
  const endH = Math.floor((total % 1440) / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function extractTableIds(r: Record<string, unknown>): string[] {
  const reservationTables = Array.isArray(r.reservationTables)
    ? (r.reservationTables as unknown[])
    : [];

  if (reservationTables.length > 0) {
    return reservationTables
      .map((entry) => asRecord(asRecord(entry).table).id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  if (Array.isArray(r.tableIds)) {
    return (r.tableIds as unknown[])
      .map((id) => String(id))
      .filter((id) => id.length > 0);
  }

  if (Array.isArray(r.table_ids)) {
    return (r.table_ids as unknown[])
      .map((id) => String(id))
      .filter((id) => id.length > 0);
  }

  if (typeof r.tableId === 'string' && r.tableId.length > 0) {
    return [r.tableId];
  }

  if (typeof r.table_id === 'string' && r.table_id.length > 0) {
    return [r.table_id];
  }

  return [];
}

function toReservation(r: Record<string, unknown>): Reservation {
  const startTime = normalizeTime(r.startTime ?? r.start_time ?? '00:00');
  const duration = toNumber(r.durationMins ?? r.duration_mins ?? r.duration ?? 90, 90);
  const endTimeRaw = r.endTime ?? r.end_time;
  const endTime = typeof endTimeRaw === 'string' && endTimeRaw.length > 0
    ? normalizeTime(endTimeRaw)
    : computeEndTime(startTime, duration);

  return {
    id: String(r.id ?? ''),
    tableIds: extractTableIds(r),
    clientName: String(r.guestName ?? r.guest_name ?? r.clientName ?? 'Cliente'),
    partySize: toNumber(r.partySize ?? r.party_size ?? 1, 1),
    date: normalizeDate(r.date),
    startTime,
    endTime,
    status: normalizeStatus(r.status),
    duration,
    notes: String(r.notes ?? ''),
  };
}

function toTable(t: Record<string, unknown>): RestaurantTable {
  const area = asRecord(t.area);
  const tableType = String(t.tableType ?? t.table_type ?? t.type ?? 'standard');
  const vipPairKey = t.vipPairKey ?? t.vip_pair_key;
  const id = String(t.id ?? '');
  const areaId = String(area.id ?? t.areaId ?? t.area_id ?? t.area ?? '');
  const name = String(t.number ?? t.name ?? `Mesa ${id}`);
  const fallback = fallbackPosition(`${areaId}-${id}-${name}`);

  return {
    id,
    areaId,
    capacity: toNumber(t.capacity, 1),
    type: tableType === 'CIRCULAR' ? 'circular' : tableType === 'VIP_SQUARE' ? 'square' : 'standard',
    name,
    x: toNumber(t.x, fallback.x),
    y: toNumber(t.y, fallback.y),
    isVIP: Boolean(area.isVip ?? area.is_vip ?? t.isVip ?? t.is_vip),
    canMerge: typeof vipPairKey === 'string' ? vipPairKey.length > 0 : Boolean(t.canMerge),
    mergeGroup: typeof vipPairKey === 'string' && vipPairKey.length > 0 ? vipPairKey : (t.mergeGroup as string | null) ?? null,
  };
}

function toArea(a: Record<string, unknown>): Area {
  const nameMap: Record<string, string> = {
    terraza: 'Terraza',
    patio: 'Patio',
    lobby: 'Lobby',
    bar: 'Bar',
    vip: 'Salones VIP',
    terrace: 'Terraza',
    vip_area: 'Salones VIP',
  };

  const areaName = String(a.name ?? nameMap[String(a.slug ?? '').toLowerCase()] ?? 'Terraza') as Area['name'];

  return {
    id: String(a.id ?? ''),
    name: areaName,
    maxTables: toNumber(a.maxTables ?? a.max_tables, 1),
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const api = {
  async getAreas(): Promise<Area[]> {
    const res = await fetch(`${API_BASE_URL}/areas`);
    if (!res.ok) throw new Error('Error al obtener áreas');
    const json = await res.json();
    return (json.data as Record<string, unknown>[]).map(toArea);
  },

  async getTables(areaId?: string): Promise<RestaurantTable[]> {
    const url = areaId
      ? `${API_BASE_URL}/tables?areaId=${areaId}`
      : `${API_BASE_URL}/tables`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener mesas');
    const json = await res.json();
    return (json.data as Record<string, unknown>[]).map(toTable);
  },

  async getReservations(date?: string, areaId?: string): Promise<Reservation[]> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (areaId) params.append('areaId', areaId);
    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE_URL}/reservations?${queryString}`
      : `${API_BASE_URL}/reservations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener reservas');
    const json = await res.json();
    return (json.data as Record<string, unknown>[]).map(toReservation);
  },

  async createReservation(data: Omit<Reservation, 'id'>): Promise<Reservation> {
    const body = {
      guestName: data.clientName,
      partySize: data.partySize,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMins: data.duration === 0 ? 90 : data.duration,
      tableIds: data.tableIds,
      tableId: data.tableIds[0],
      isVip: data.tableIds.length > 1,
      status: 'CONFIRMED',
      notes: data.notes,
    };

    const res = await fetch(`${API_BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      throw { status: res.status, message: json.error ?? 'Error al crear reserva' };
    }

    return toReservation(json.data as Record<string, unknown>);
  },

  async updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      confirmed: 'CONFIRMED',
      cancelled: 'CANCELLED',
      completed: 'COMPLETED',
      no_show: 'NO_SHOW',
    };

    const res = await fetch(`${API_BASE_URL}/reservations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusMap[status] }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw { status: res.status, message: json.error ?? 'Error al actualizar reserva' };
    }

    return toReservation(json.data as Record<string, unknown>);
  },

  async getAvailability(
    date: string,
    partySize: number,
    startTime: string,
    areaPreference?: string
  ): Promise<AvailabilityResponse> {
    const areaSlugMap: Record<string, string> = {
      'area-terraza': 'TERRACE',
      'area-patio': 'PATIO',
      'area-lobby': 'LOBBY',
      'area-bar': 'BAR',
      'area-vip': 'VIP',
    };

    const params = new URLSearchParams({
      date,
      partySize: String(partySize),
      startTime,
      areaPreference: areaPreference ? (areaSlugMap[areaPreference] ?? 'ANY') : 'ANY',
    });

    const res = await fetch(`${API_BASE_URL}/availability?${params}`);
    const json = await res.json();

    if (!res.ok) {
      throw { status: res.status, message: json.error ?? 'Error al consultar disponibilidad' };
    }

    interface ApiOption {
      tableIds: string[];
      totalCapacity: number;
      tableNumbers: string[];
    }

    const options = (json.options as ApiOption[]) ?? [];

    const suggested = options.slice(0, 3).map((o) => ({
      tableIds: o.tableIds,
      capacity: o.totalCapacity,
      tableName: o.tableNumbers.join(' + '),
    }));

    const alternatives = options.slice(3, 6).map((o) => ({
      tableIds: o.tableIds,
      capacity: o.totalCapacity,
      tableName: o.tableNumbers.join(' + '),
    }));

    return { suggestedTables: suggested, alternatives };
  },

  resetMockData(): void {
    console.warn('resetMockData no aplica cuando se usa la API real.');
  },
};