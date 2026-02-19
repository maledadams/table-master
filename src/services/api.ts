/**
 * API Service Layer
 * Mock backend with domain rules, validation, idempotency and persistence.
 * Set API_BASE_URL when connecting to external REST API.
 */

import { z } from 'zod';
import { Area, RestaurantTable, Reservation, ReservationStatus, AvailabilityResponse } from '@/types/restaurant';
import { mockAreas, mockTables, mockReservations } from '@/data/mock-data';
import { ApiError } from '@/services/errors';
import {
  areaSchema,
  createReservationInputSchema,
  createWalkInInputSchema,
  dateSchema,
  idempotencyKeySchema,
  reservationSchema,
  reservationStatusSchema,
  restaurantTableSchema,
  timeSchema,
  updateTablePositionInputSchema,
} from '@/services/domain/schemas';
import {
  canTransitionReservationStatus,
  hasTableOverlap,
  isActiveReservationStatus,
  listVipFunctionalUnitKeys,
} from '@/services/domain/reservation-rules';
import { clampTablePositionToArea } from '@/services/domain/table-position-rules';

const API_BASE_URL = ''; // Set this when connecting to real API
void API_BASE_URL;

type TableRecord = RestaurantTable & { version: number; updatedAt: string };
type IdempotencyRecord = {
  reservationId: string;
  requestHash: string;
  createdAtMs: number;
};

const TABLES_STORAGE_KEY = 'restaurant.tables.v2';
const RESERVATIONS_STORAGE_KEY = 'restaurant.reservations.v2';
const IDEMPOTENCY_STORAGE_KEY = 'restaurant.idempotency.v2';
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 700;

let initialized = false;
let reservations: Reservation[] = [];
let tables: TableRecord[] = [];
let idempotencyRecords: Record<string, IdempotencyRecord> = {};
let nextId = 100;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

function computeRequestHash(payload: unknown): string {
  return hashString(JSON.stringify(payload));
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, message = 'Datos inválidos'): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new ApiError({
    status: 422,
    code: 'VALIDATION_ERROR',
    message,
    details: result.error.flatten(),
  });
}

function normalizeTable(table: RestaurantTable): TableRecord {
  return {
    ...table,
    version: table.version ?? 1,
    updatedAt: table.updatedAt ?? new Date().toISOString(),
  };
}

function safeLoadStorage<T>(key: string, schema: z.ZodType<T>): T | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsedJson = JSON.parse(raw);
    const parsedData = schema.safeParse(parsedJson);
    if (!parsedData.success) return null;
    return parsedData.data;
  } catch {
    return null;
  }
}

function persistState(): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(tables));
  window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(reservations));
  window.localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(idempotencyRecords));
}

function setDefaultState(): void {
  tables = mockTables.map(normalizeTable);
  reservations = mockReservations.map((reservation) => parseOrThrow(reservationSchema, reservation));
  idempotencyRecords = {};

  const maxExistingId = reservations.reduce((maxId, reservation) => {
    const numericPart = Number(reservation.id.replace('res-', ''));
    if (!Number.isFinite(numericPart)) return maxId;
    return Math.max(maxId, numericPart);
  }, 99);
  nextId = maxExistingId + 1;
}

function ensureInitialized(): void {
  if (initialized) return;

  const tablesSchema = z.array(restaurantTableSchema);
  const reservationsSchema = z.array(reservationSchema);
  const idempotencySchema = z.record(
    z.object({
      reservationId: z.string().min(1),
      requestHash: z.string().min(1),
      createdAtMs: z.number().finite(),
    })
  );

  const persistedTables = safeLoadStorage(TABLES_STORAGE_KEY, tablesSchema);
  const persistedReservations = safeLoadStorage(RESERVATIONS_STORAGE_KEY, reservationsSchema);
  const persistedIdempotency = safeLoadStorage(IDEMPOTENCY_STORAGE_KEY, idempotencySchema);

  if (persistedTables && persistedReservations) {
    tables = persistedTables.map(normalizeTable);
    reservations = persistedReservations;
    idempotencyRecords = persistedIdempotency ?? {};
    const maxExistingId = reservations.reduce((maxId, reservation) => {
      const numericPart = Number(reservation.id.replace('res-', ''));
      if (!Number.isFinite(numericPart)) return maxId;
      return Math.max(maxId, numericPart);
    }, 99);
    nextId = maxExistingId + 1;
  } else {
    setDefaultState();
    persistState();
  }

  initialized = true;
}

function cleanupIdempotencyRecords(): void {
  const now = Date.now();
  const filteredEntries = Object.entries(idempotencyRecords).filter(
    ([, record]) => now - record.createdAtMs <= IDEMPOTENCY_TTL_MS
  );
  idempotencyRecords = Object.fromEntries(filteredEntries);
}

function generateReservationId(): string {
  return `res-${nextId++}`;
}

function validateNoPastReservation(data: Omit<Reservation, 'id'>): void {
  if (data.duration <= 0) return;
  const now = new Date();
  const reservationDate = new Date(`${data.date}T${data.startTime}:00`);
  if (reservationDate < now) {
    throw new ApiError({
      status: 422,
      code: 'UNPROCESSABLE_ENTITY',
      message: 'No se permiten reservas en el pasado.',
    });
  }
}

function validateVipRules(data: Omit<Reservation, 'id'>): void {
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const requestedTables = data.tableIds.map((tableId) => tableById.get(tableId)).filter(Boolean) as TableRecord[];

  const requestedVipTables = requestedTables.filter((table) => table.isVIP);
  if (requestedVipTables.length === 0) return;

  const requestedMergedVipAb = requestedVipTables.filter(
    (table) => table.canMerge && table.mergeGroup === 'VIP_AB'
  );
  if (requestedMergedVipAb.length === 2 && data.partySize > 6) {
    throw new ApiError({
      status: 422,
      code: 'UNPROCESSABLE_ENTITY',
      message: 'Las mesas A+B combinadas soportan máximo 6 personas.',
    });
  }

  const unitKeys = listVipFunctionalUnitKeys({
    reservations,
    tables,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });
  const requestedUnitKey = requestedVipTables
    .map((table) => table.id)
    .sort()
    .join(',');
  if (requestedUnitKey) unitKeys.add(requestedUnitKey);

  if (unitKeys.size > 2) {
    throw new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Máximo 2 unidades funcionales VIP simultáneas.',
      details: { vipUnits: Array.from(unitKeys) },
    });
  }
}

function ensureNoReservationOverlap(data: Omit<Reservation, 'id'>): void {
  const overlap = hasTableOverlap({
    reservations,
    tableIds: data.tableIds,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });
  if (overlap) {
    throw new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'La mesa ya está reservada en ese horario.',
    });
  }
}

function validateIdempotencyOrReturnExisting(
  idempotencyKey: string,
  data: Omit<Reservation, 'id'>
): Reservation | null {
  cleanupIdempotencyRecords();
  const requestHash = computeRequestHash(data);
  const existingRecord = idempotencyRecords[idempotencyKey];
  if (!existingRecord) return null;

  if (existingRecord.requestHash !== requestHash) {
    throw new ApiError({
      status: 409,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'Idempotency-Key reutilizado con payload diferente.',
      details: {
        previousReservationId: existingRecord.reservationId,
      },
    });
  }

  const existingReservation = reservations.find((reservation) => reservation.id === existingRecord.reservationId);
  if (!existingReservation) return null;
  return existingReservation;
}

function registerIdempotencyResult(idempotencyKey: string, data: Omit<Reservation, 'id'>, reservationId: string): void {
  idempotencyRecords[idempotencyKey] = {
    reservationId,
    requestHash: computeRequestHash(data),
    createdAtMs: Date.now(),
  };
}

ensureInitialized();

export const api = {
  async getAreas(): Promise<Area[]> {
    ensureInitialized();
    const parsed = parseOrThrow(z.array(areaSchema), mockAreas, 'Áreas inválidas');
    return deepClone(parsed);
  },

  async getTables(areaId?: string): Promise<RestaurantTable[]> {
    ensureInitialized();
    const filtered = areaId ? tables.filter((table) => table.areaId === areaId) : tables;
    const parsed = parseOrThrow(z.array(restaurantTableSchema), filtered, 'Mesas inválidas');
    return deepClone(parsed);
  },

  async getReservations(date: string, areaId?: string): Promise<Reservation[]> {
    ensureInitialized();
    const parsedDate = parseOrThrow(dateSchema, date, 'Fecha inválida');
    let filtered = reservations.filter((reservation) => reservation.date === parsedDate);
    if (areaId) {
      const areaTableIds = new Set(tables.filter((table) => table.areaId === areaId).map((table) => table.id));
      filtered = filtered.filter((reservation) =>
        reservation.tableIds.some((tableId) => areaTableIds.has(tableId))
      );
    }
    const parsed = parseOrThrow(z.array(reservationSchema), filtered, 'Reservas inválidas');
    return deepClone(parsed);
  },

  async createReservation(
    data: Omit<Reservation, 'id'>,
    options: { idempotencyKey: string }
  ): Promise<Reservation> {
    ensureInitialized();
    const parsedData = parseOrThrow(createReservationInputSchema, data, 'Solicitud de reserva inválida');
    const idempotencyKey = parseOrThrow(
      idempotencyKeySchema,
      options?.idempotencyKey,
      'Idempotency-Key inválido o faltante'
    );

    const existing = validateIdempotencyOrReturnExisting(idempotencyKey, parsedData);
    if (existing) return deepClone(existing);

    validateNoPastReservation(parsedData);
    ensureNoReservationOverlap(parsedData);
    validateVipRules(parsedData);

    const reservation: Reservation = { ...parsedData, id: generateReservationId() };
    reservations.push(reservation);
    registerIdempotencyResult(idempotencyKey, parsedData, reservation.id);
    persistState();

    return deepClone(parseOrThrow(reservationSchema, reservation, 'Reserva inválida'));
  },

  async createWalkIn(data: {
    tableId: string;
    clientName?: string;
    partySize?: number;
    notes?: string;
  }): Promise<Reservation> {
    ensureInitialized();
    const parsedData = parseOrThrow(createWalkInInputSchema, data, 'Solicitud de walk-in inválida');
    const table = tables.find((item) => item.id === parsedData.tableId);
    if (!table) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Mesa no encontrada.',
      });
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    let startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    let endTime = '23:59';
    if (startTime >= endTime) {
      startTime = '23:58';
      endTime = '23:59';
    }
    parseOrThrow(timeSchema, startTime, 'Hora de inicio inválida');
    parseOrThrow(timeSchema, endTime, 'Hora de fin inválida');

    const overlap = hasTableOverlap({
      reservations,
      tableIds: [table.id],
      date,
      startTime,
      endTime,
    });
    if (overlap) {
      throw new ApiError({
        status: 409,
        code: 'CONFLICT',
        message: 'La mesa ya está ocupada o reservada en ese horario.',
      });
    }

    const walkIn: Reservation = parseOrThrow(
      reservationSchema,
      {
        id: generateReservationId(),
        tableIds: [table.id],
        clientName: parsedData.clientName?.trim() || 'Walk-in',
        partySize: parsedData.partySize ?? 1,
        date,
        startTime,
        endTime,
        status: 'confirmed',
        duration: 0,
        notes: parsedData.notes?.trim() || 'Sin reserva',
      },
      'Walk-in inválido'
    );

    reservations.push(walkIn);
    persistState();
    return deepClone(walkIn);
  },

  async updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    ensureInitialized();
    const parsedId = parseOrThrow(z.string().min(1), id, 'Id de reserva inválido');
    const parsedStatus = parseOrThrow(reservationStatusSchema, status, 'Estado inválido');
    const index = reservations.findIndex((reservation) => reservation.id === parsedId);
    if (index === -1) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Reserva no encontrada.',
      });
    }

    const current = reservations[index];
    if (current.status !== parsedStatus && !canTransitionReservationStatus(current.status, parsedStatus)) {
      throw new ApiError({
        status: 422,
        code: 'UNPROCESSABLE_ENTITY',
        message: `Transición de estado inválida: ${current.status} -> ${parsedStatus}`,
      });
    }

    reservations[index] = { ...current, status: parsedStatus };
    persistState();
    return deepClone(reservations[index]);
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
    ensureInitialized();
    const parsedInput = parseOrThrow(
      updateTablePositionInputSchema,
      input,
      'Solicitud de actualización de posición inválida'
    );

    const index = tables.findIndex((table) => table.id === parsedInput.tableId);
    if (index === -1) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Mesa no encontrada.',
      });
    }

    const currentTable = tables[index];
    if (
      typeof parsedInput.expectedVersion === 'number' &&
      parsedInput.expectedVersion !== currentTable.version
    ) {
      throw new ApiError({
        status: 409,
        code: 'CONCURRENCY_CONFLICT',
        message: 'La mesa fue modificada por otro usuario. Refresca e inténtalo de nuevo.',
        details: {
          expectedVersion: parsedInput.expectedVersion,
          currentVersion: currentTable.version,
          updatedAt: currentTable.updatedAt,
        },
      });
    }

    const clamped = clampTablePositionToArea({
      table: currentTable,
      areaId: parsedInput.areaId ?? currentTable.areaId,
      x: parsedInput.x,
      y: parsedInput.y,
      canvasWidth: parsedInput.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      canvasHeight: parsedInput.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
      isMergedView: parsedInput.isMergedView,
    });

    tables[index] = {
      ...currentTable,
      x: clamped.x,
      y: clamped.y,
      version: currentTable.version + 1,
      updatedAt: new Date().toISOString(),
    };
    persistState();
    return deepClone(parseOrThrow(restaurantTableSchema, tables[index], 'Mesa inválida'));
  },

  async getAvailability(
    date: string,
    partySize: number,
    startTime: string,
    areaPreference?: string
  ): Promise<AvailabilityResponse> {
    ensureInitialized();
    const parsedDate = parseOrThrow(dateSchema, date, 'Fecha inválida');
    const parsedPartySize = parseOrThrow(z.number().int().positive(), partySize, 'partySize inválido');
    const parsedStartTime = parseOrThrow(timeSchema, startTime, 'Hora inválida');

    const duration = 90;
    const [hours, minutes] = parsedStartTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    let filteredTables = [...tables];
    if (areaPreference) {
      filteredTables = filteredTables.filter((table) => table.areaId === areaPreference);
    }

    const available = filteredTables
      .filter((table) => table.capacity >= parsedPartySize)
      .filter(
        (table) =>
          !hasTableOverlap({
            reservations,
            tableIds: [table.id],
            date: parsedDate,
            startTime: parsedStartTime,
            endTime,
          })
      )
      .sort((tableA, tableB) => tableA.capacity - tableB.capacity);

    const suggested = available.slice(0, 3).map((table) => ({
      tableIds: [table.id],
      capacity: table.capacity,
      tableName: table.name,
    }));

    const alternatives = available.slice(3, 6).map((table) => ({
      tableIds: [table.id],
      capacity: table.capacity,
      tableName: table.name,
    }));

    return { suggestedTables: suggested, alternatives };
  },

  // Reset mock data (for testing)
  resetMockData() {
    setDefaultState();
    persistState();
  },
};

export function isReservationActiveStatus(status: ReservationStatus): boolean {
  return isActiveReservationStatus(status);
}
