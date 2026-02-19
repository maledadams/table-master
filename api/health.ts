import { methodNotAllowed } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  return res.status(200).json({
    status: 'ok',
    service: 'table-master-api',
    timestamp: new Date().toISOString(),
  });
}
