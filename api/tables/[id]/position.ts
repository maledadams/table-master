import { api as dataApi } from '../../../src/services/api';
import { methodNotAllowed, sendError } from '../../_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);

  try {
    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    const updated = await dataApi.updateTablePosition({
      tableId: id,
      x: req.body?.x,
      y: req.body?.y,
      expectedVersion: req.body?.expectedVersion,
      areaId: req.body?.areaId,
      canvasWidth: req.body?.canvasWidth,
      canvasHeight: req.body?.canvasHeight,
      isMergedView: req.body?.isMergedView,
    });
    return res.status(200).json(updated);
  } catch (error) {
    return sendError(res, error);
  }
}
