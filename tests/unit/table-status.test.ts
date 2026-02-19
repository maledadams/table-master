import { describe, expect, it } from 'vitest';
import { computeVisualStatus } from '@/store/restaurant-store';
import { Reservation, RestaurantTable } from '@/types/restaurant';

describe('table status normalization', () => {
  const table: RestaurantTable = {
    id: 't-p1',
    areaId: 'area-patio',
    capacity: 4,
    type: 'standard',
    name: 'P1',
    isVIP: false,
    canMerge: false,
    mergeGroup: null,
    x: 10,
    y: 10,
  };

  it('maps duration 0 reservation as occupied', () => {
    const reservations: Reservation[] = [
      {
        id: 'res-walkin',
        tableIds: ['t-p1'],
        clientName: 'Walk-in',
        partySize: 2,
        date: '2026-02-19',
        startTime: '12:00',
        endTime: '23:59',
        status: 'confirmed',
        duration: 0,
        notes: '',
      },
    ];

    const result = computeVisualStatus(table, reservations, new Date('2026-02-19T14:00:00'));
    expect(result.status).toBe('occupied');
  });

  it('maps active time window as reserved_active', () => {
    const reservations: Reservation[] = [
      {
        id: 'res-1',
        tableIds: ['t-p1'],
        clientName: 'Client',
        partySize: 4,
        date: '2026-02-19',
        startTime: '13:00',
        endTime: '14:30',
        status: 'confirmed',
        duration: 90,
        notes: '',
      },
    ];

    const result = computeVisualStatus(table, reservations, new Date('2026-02-19T13:20:00'));
    expect(result.status).toBe('reserved_active');
  });
});
