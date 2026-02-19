import { api as dataApi } from '../../../src/services/api';
import { methodNotAllowed, sendError } from '../../_lib/http';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    const today = getTodayDateString();
    const reservations = await dataApi.getReservations(today);
    const activeReservation = reservations.find(
      (reservation) =>
        reservation.tableIds.includes(id) &&
        reservation.status !== 'cancelled' &&
        reservation.status !== 'completed' &&
        reservation.status !== 'no_show'
    );

    if (!activeReservation) {
      return res.status(200).json({ ok: true, released: false });
    }

    const updated = await dataApi.updateReservationStatus(activeReservation.id, 'completed');
    return res.status(200).json({ ok: true, released: true, reservation: updated });
  } catch (error) {
    return sendError(res, error);
  }
}
