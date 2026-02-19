import { Reservation, ReservationStatus, RestaurantTable } from '@/types/restaurant';

const ACTIVE_RESERVATION_STATUSES: ReadonlySet<ReservationStatus> = new Set(['pending', 'confirmed']);

export function isActiveReservationStatus(status: ReservationStatus): boolean {
  return ACTIVE_RESERVATION_STATUSES.has(status);
}

export function hasTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export function hasTableOverlap(params: {
  reservations: Reservation[];
  tableIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): boolean {
  const { reservations, tableIds, date, startTime, endTime, excludeId } = params;
  return reservations.some((reservation) => {
    if (reservation.id === excludeId) return false;
    if (reservation.date !== date) return false;
    if (!isActiveReservationStatus(reservation.status)) return false;
    if (!reservation.tableIds.some((tableId) => tableIds.includes(tableId))) return false;
    return hasTimeOverlap(reservation.startTime, reservation.endTime, startTime, endTime);
  });
}

function getReservationVipUnitKey(reservation: Reservation, tableById: Map<string, RestaurantTable>): string | null {
  const vipIds = reservation.tableIds
    .filter((tableId) => tableById.get(tableId)?.isVIP)
    .sort();
  if (vipIds.length === 0) return null;
  return vipIds.join(',');
}

export function countVipFunctionalUnits(params: {
  reservations: Reservation[];
  tables: RestaurantTable[];
  date: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): number {
  return listVipFunctionalUnitKeys(params).size;
}

export function listVipFunctionalUnitKeys(params: {
  reservations: Reservation[];
  tables: RestaurantTable[];
  date: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): Set<string> {
  const { reservations, tables, date, startTime, endTime, excludeId } = params;
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const unitKeys = new Set<string>();

  for (const reservation of reservations) {
    if (reservation.id === excludeId) continue;
    if (reservation.date !== date) continue;
    if (!isActiveReservationStatus(reservation.status)) continue;
    if (!hasTimeOverlap(reservation.startTime, reservation.endTime, startTime, endTime)) continue;
    const key = getReservationVipUnitKey(reservation, tableById);
    if (key) unitKeys.add(key);
  }

  return unitKeys;
}

const statusTransitionMap: Record<ReservationStatus, ReadonlySet<ReservationStatus>> = {
  pending: new Set(['confirmed', 'cancelled', 'no_show']),
  confirmed: new Set(['completed', 'cancelled', 'no_show']),
  cancelled: new Set([]),
  completed: new Set([]),
  no_show: new Set([]),
};

export function canTransitionReservationStatus(current: ReservationStatus, next: ReservationStatus): boolean {
  return statusTransitionMap[current].has(next);
}
