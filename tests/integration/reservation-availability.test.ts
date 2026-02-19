import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '@/services/api';

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

describe('integration: reserve then check availability', () => {
  beforeEach(() => {
    api.resetMockData();
  });

  it('blocks reserved table from availability results in same window', async () => {
    const date = tomorrowDate();

    const created = await api.createReservation(
      {
        tableIds: ['t-p1'],
        clientName: 'Integration Test',
        partySize: 2,
        date,
        startTime: '20:00',
        endTime: '21:30',
        status: 'confirmed',
        duration: 90,
        notes: 'integration',
      },
      { idempotencyKey: `integration-${date}-p1` }
    );

    expect(created.id).toBeTruthy();

    const availability = await api.getAvailability(date, 2, '20:00', 'area-patio');
    const allSuggested = [...availability.suggestedTables, ...availability.alternatives];
    const hasP1 = allSuggested.some((s) => s.tableIds.includes('t-p1'));

    expect(hasP1).toBe(false);
  });
});
