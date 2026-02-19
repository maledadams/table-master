import { api as dataApi } from '../src/services/api';
import { getHeader, getQueryParam, methodNotAllowed, sendError } from './_lib/http';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const date = getQueryParam(req, 'date') ?? getTodayDateString();
      const areaId = getQueryParam(req, 'areaId');
      const reservations = await dataApi.getReservations(date, areaId);
      return res.status(200).json(reservations);
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === 'POST') {
    try {
      const idempotencyKey = getHeader(req, 'idempotency-key');
      const reservation = await dataApi.createReservation(req.body, {
        idempotencyKey: idempotencyKey ?? '',
      });
      return res.status(201).json(reservation);
    } catch (error) {
      return sendError(res, error);
    }
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
