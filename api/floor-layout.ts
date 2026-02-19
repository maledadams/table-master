import { api as dataApi } from '../src/services/api';
import { getQueryParam, methodNotAllowed, sendError } from './_lib/http';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const date = getQueryParam(req, 'date') ?? getTodayDateString();
    const areaId = getQueryParam(req, 'areaId');

    const [areas, tables, reservations] = await Promise.all([
      dataApi.getAreas(),
      dataApi.getTables(areaId),
      dataApi.getReservations(date, areaId),
    ]);

    return res.status(200).json({
      date,
      areaId: areaId ?? null,
      areas,
      tables,
      reservations,
    });
  } catch (error) {
    return sendError(res, error);
  }
}
