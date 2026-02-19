import { api as dataApi } from '../src/services/api';
import { getQueryParam, methodNotAllowed, sendError } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const areaId = getQueryParam(req, 'areaId');
      const tables = await dataApi.getTables(areaId);
      return res.status(200).json(tables);
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === 'POST') {
    try {
      const table = await dataApi.createTable({
        areaId: req.body?.areaId,
        capacity: req.body?.capacity,
        type: req.body?.type,
      });
      return res.status(201).json(table);
    } catch (error) {
      return sendError(res, error);
    }
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
