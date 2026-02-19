import { Area, AvailabilityResponse, Reservation, ReservationStatus, RestaurantTable } from '@/types/restaurant';
import { ApiError } from '@/services/errors';

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.code ?? 'INTERNAL_ERROR',
      message: payload?.message ?? 'Request failed.',
      details: payload?.details,
    });
  }

  return payload as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    search.set(key, String(value));
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}

export const api = {
  async getAreas(): Promise<Area[]> {
    const response = await fetch('/api/areas');
    return parseResponse<Area[]>(response);
  },

  async getTables(areaId?: string): Promise<RestaurantTable[]> {
    const response = await fetch(`/api/tables${buildQuery({ areaId })}`);
    return parseResponse<RestaurantTable[]>(response);
  },

  async createTable(input: {
    areaId: string;
    capacity?: 2 | 4 | 6 | 8;
    type?: 'standard' | 'square';
  }): Promise<RestaurantTable> {
    const response = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseResponse<RestaurantTable>(response);
  },

  async getReservations(date: string, areaId?: string): Promise<Reservation[]> {
    const response = await fetch(`/api/reservations${buildQuery({ date, areaId })}`);
    return parseResponse<Reservation[]>(response);
  },

  async createReservation(
    data: Omit<Reservation, 'id'>,
    options: { idempotencyKey: string }
  ): Promise<Reservation> {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': options.idempotencyKey,
      },
      body: JSON.stringify(data),
    });
    return parseResponse<Reservation>(response);
  },

  async createWalkIn(data: {
    tableId: string;
    clientName?: string;
    partySize?: number;
    notes?: string;
  }): Promise<Reservation> {
    const response = await fetch('/api/walkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseResponse<Reservation>(response);
  },

  async updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    const response = await fetch(`/api/reservations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return parseResponse<Reservation>(response);
  },

  async updateTablePosition(input: {
    tableId: string;
    x: number;
    y: number;
    expectedVersion?: number;
    areaId?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    isMergedView?: boolean;
  }): Promise<RestaurantTable> {
    const response = await fetch(`/api/tables/${input.tableId}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseResponse<RestaurantTable>(response);
  },

  async releaseTable(tableId: string): Promise<{ ok: boolean; released: boolean; reservation?: Reservation }> {
    const response = await fetch(`/api/tables/${tableId}/release`, {
      method: 'POST',
    });
    return parseResponse<{ ok: boolean; released: boolean; reservation?: Reservation }>(response);
  },

  async getAvailability(
    date: string,
    partySize: number,
    startTime: string,
    areaPreference?: string
  ): Promise<AvailabilityResponse> {
    const response = await fetch(
      `/api/availability${buildQuery({ date, partySize, startTime, areaPreference })}`
    );
    return parseResponse<AvailabilityResponse>(response);
  },

  async resetMockData(): Promise<void> {
    const response = await fetch('/api/admin/reset', { method: 'POST' });
    await parseResponse<{ ok: boolean }>(response);
  },
};
