import { describe, expect, it } from 'vitest';
import { hasTableOverlap } from '@/services/domain/reservation-rules';
import { Reservation } from '@/types/restaurant';

describe('no overlap rule', () => {
  it('detects overlap on the same table and active status', () => {
    const reservations: Reservation[] = [
      {
        id: 'res-1',
        tableIds: ['t-p1'],
        clientName: 'A',
        partySize: 2,
        date: '2026-02-19',
        startTime: '20:00',
        endTime: '21:30',
        status: 'confirmed',
        duration: 90,
        notes: '',
      },
    ];

    const overlap = hasTableOverlap({
      reservations,
      tableIds: ['t-p1'],
      date: '2026-02-19',
      startTime: '21:00',
      endTime: '22:00',
    });

    expect(overlap).toBe(true);
  });

  it('ignores cancelled/completed reservations for overlap', () => {
    const reservations: Reservation[] = [
      {
        id: 'res-1',
        tableIds: ['t-p1'],
        clientName: 'A',
        partySize: 2,
        date: '2026-02-19',
        startTime: '20:00',
        endTime: '21:30',
        status: 'cancelled',
        duration: 90,
        notes: '',
      },
    ];

    const overlap = hasTableOverlap({
      reservations,
      tableIds: ['t-p1'],
      date: '2026-02-19',
      startTime: '20:30',
      endTime: '21:00',
    });

    expect(overlap).toBe(false);
  });
});
