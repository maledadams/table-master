/**
 * API Service Layer
 * Currently uses mock data. Replace implementations with real API calls.
 * Set API_BASE_URL when connecting to external REST API.
 */

import { Area, RestaurantTable, Reservation, ReservationStatus, AvailabilityResponse } from '@/types/restaurant';
import { mockAreas, mockTables, mockReservations } from '@/data/mock-data';

const API_BASE_URL = ''; // Set this when connecting to real API

// In-memory store for mock mode
let reservations = [...mockReservations];
let nextId = 100;

function generateId(): string {
  return `res-${nextId++}`;
}

// Check overlap for a set of tableIds in a time range
function hasOverlap(
  tableIds: string[],
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): boolean {
  return reservations.some((r) => {
    if (r.id === excludeId) return false;
    if (r.date !== date) return false;
    if (r.status === 'cancelled' || r.status === 'completed' || r.status === 'no_show') return false;
    const hasCommonTable = r.tableIds.some((id) => tableIds.includes(id));
    if (!hasCommonTable) return false;
    // Overlap check
    return r.startTime < endTime && r.endTime > startTime;
  });
}

export const api = {
  async getAreas(): Promise<Area[]> {
    return [...mockAreas];
  },

  async getTables(areaId?: string): Promise<RestaurantTable[]> {
    if (areaId) return mockTables.filter((t) => t.areaId === areaId);
    return [...mockTables];
  },

  async getReservations(date: string, areaId?: string): Promise<Reservation[]> {
    let filtered = reservations.filter((r) => r.date === date);
    if (areaId) {
      const areaTables = mockTables.filter((t) => t.areaId === areaId).map((t) => t.id);
      filtered = filtered.filter((r) => r.tableIds.some((id) => areaTables.includes(id)));
    }
    return filtered;
  },

  async createReservation(data: Omit<Reservation, 'id'>): Promise<Reservation> {
    // Validate no past
    const now = new Date();
    const resDate = new Date(`${data.date}T${data.startTime}`);
    if (resDate < now && data.duration > 0) {
      throw { status: 422, message: 'No se permiten reservas en el pasado.' };
    }

    // Validate overlap
    if (hasOverlap(data.tableIds, data.date, data.startTime, data.endTime)) {
      throw { status: 409, message: 'La mesa ya está reservada en ese horario.' };
    }

    // VIP functional unit check
    const vipTableIds = data.tableIds.filter((id) => {
      const t = mockTables.find((mt) => mt.id === id);
      return t?.isVIP;
    });

    if (vipTableIds.length > 0) {
      const activeVipRes = reservations.filter((r) => {
        if (r.date !== data.date) return false;
        if (r.status === 'cancelled' || r.status === 'completed' || r.status === 'no_show') return false;
        if (!(r.startTime < data.endTime && r.endTime > data.startTime)) return false;
        return r.tableIds.some((id) => {
          const t = mockTables.find((mt) => mt.id === id);
          return t?.isVIP;
        });
      });

      // Count functional units
      let units = 0;
      const counted = new Set<string>();
      for (const r of activeVipRes) {
        const key = r.tableIds.sort().join(',');
        if (!counted.has(key)) {
          counted.add(key);
          units++;
        }
      }
      if (units >= 2) {
        throw { status: 409, message: 'Máximo 2 unidades funcionales VIP simultáneas.' };
      }
    }

    const reservation: Reservation = { ...data, id: generateId() };
    reservations.push(reservation);
    return reservation;
  },

  async updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    const idx = reservations.findIndex((r) => r.id === id);
    if (idx === -1) throw { status: 404, message: 'Reserva no encontrada.' };
    reservations[idx] = { ...reservations[idx], status };
    return reservations[idx];
  },

  async getAvailability(
    date: string,
    partySize: number,
    startTime: string,
    areaPreference?: string
  ): Promise<AvailabilityResponse> {
    const duration = 90;
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    let tables = [...mockTables];
    if (areaPreference) {
      tables = tables.filter((t) => t.areaId === areaPreference);
    }

    const available = tables
      .filter((t) => t.capacity >= partySize)
      .filter((t) => !hasOverlap([t.id], date, startTime, endTime))
      .sort((a, b) => a.capacity - b.capacity);

    const suggested = available.slice(0, 3).map((t) => ({
      tableIds: [t.id],
      capacity: t.capacity,
      tableName: t.name,
    }));

    const alternatives = available.slice(3, 6).map((t) => ({
      tableIds: [t.id],
      capacity: t.capacity,
      tableName: t.name,
    }));

    return { suggestedTables: suggested, alternatives };
  },

  // Reset mock data (for testing)
  resetMockData() {
    reservations = [...mockReservations];
    nextId = 100;
  },
};
