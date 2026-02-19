import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dateSchema = z.string().regex(dateRegex, 'La fecha debe tener formato YYYY-MM-DD');
export const timeSchema = z.string().regex(timeRegex, 'La hora debe tener formato HH:mm');
export const idempotencyKeySchema = z.string().min(8).max(128);

export const areaSchema = z.object({
  id: z.string().min(1),
  name: z.enum(['Terraza', 'Patio', 'Lobby', 'Bar', 'Salones VIP']),
  maxTables: z.number().int().positive(),
});

export const restaurantTableSchema = z.object({
  id: z.string().min(1),
  areaId: z.string().min(1),
  capacity: z.number().int().positive(),
  type: z.enum(['standard', 'circular', 'square']),
  name: z.string().min(1),
  isVIP: z.boolean(),
  canMerge: z.boolean(),
  mergeGroup: z.string().nullable(),
  x: z.number().finite(),
  y: z.number().finite(),
  version: z.number().int().positive().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const reservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);

export const reservationSchema = z.object({
  id: z.string().min(1),
  tableIds: z.array(z.string().min(1)).min(1),
  clientName: z.string().min(1),
  partySize: z.number().int().positive(),
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  status: reservationStatusSchema,
  duration: z.number().int().min(0),
  notes: z.string(),
});

export const createReservationInputSchema = reservationSchema
  .omit({ id: true })
  .superRefine((value, ctx) => {
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startTime debe ser menor a endTime (sin cruce de dia).',
        path: ['endTime'],
      });
    }
  });

export const createWalkInInputSchema = z.object({
  tableId: z.string().min(1),
  clientName: z.string().trim().min(1).max(120).optional(),
  partySize: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updateTablePositionInputSchema = z.object({
  tableId: z.string().min(1),
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  expectedVersion: z.number().int().positive().optional(),
  areaId: z.string().min(1).optional(),
  canvasWidth: z.number().finite().positive().optional(),
  canvasHeight: z.number().finite().positive().optional(),
  isMergedView: z.boolean().optional(),
});
