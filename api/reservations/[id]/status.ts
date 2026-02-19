import { api as dataApi } from '../../../src/services/api';
import { methodNotAllowed, sendError } from '../../_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);

  try {
    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    const status = req.body?.status;
    const reservation = await dataApi.updateReservationStatus(id, status);
    return res.status(200).json(reservation);
  } catch (error) {
    return sendError(res, error);
  }
}
