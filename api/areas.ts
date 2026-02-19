import { api as dataApi } from '../src/services/api';
import { methodNotAllowed, sendError } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const areas = await dataApi.getAreas();
    return res.status(200).json(areas);
  } catch (error) {
    return sendError(res, error);
  }
}
