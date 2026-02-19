import { api as dataApi } from '../src/services/api';
import { methodNotAllowed, sendError } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const reservation = await dataApi.createWalkIn({
      tableId: req.body?.tableId,
      clientName: req.body?.clientName,
      partySize: req.body?.partySize,
      notes: req.body?.notes,
    });
    return res.status(201).json(reservation);
  } catch (error) {
    return sendError(res, error);
  }
}
