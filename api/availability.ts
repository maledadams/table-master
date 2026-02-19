import { api as dataApi } from '../src/services/api';
import { getQueryParam, methodNotAllowed, sendError } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const date = getQueryParam(req, 'date') ?? new Date().toISOString().split('T')[0];
    const partySizeRaw = getQueryParam(req, 'partySize') ?? '1';
    const partySize = Number(partySizeRaw);
    const startTime = getQueryParam(req, 'startTime') ?? '12:00';
    const areaPreference = getQueryParam(req, 'areaPreference');

    const availability = await dataApi.getAvailability(date, partySize, startTime, areaPreference);
    return res.status(200).json(availability);
  } catch (error) {
    return sendError(res, error);
  }
}
