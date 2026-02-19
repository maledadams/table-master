import { api as dataApi } from '../../src/services/api';
import { methodNotAllowed, sendError } from '../_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    dataApi.resetMockData();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error);
  }
}
