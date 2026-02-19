import { ApiError } from '../../src/services/errors';

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getQueryParam(
  req: { query?: Record<string, string | string[] | undefined> },
  key: string
): string | undefined {
  return firstQueryValue(req.query?.[key]);
}

export function getHeader(
  req: { headers?: Record<string, string | string[] | undefined> },
  key: string
): string | undefined {
  if (!req.headers) return undefined;
  const normalizedKey = key.toLowerCase();
  const found = Object.entries(req.headers).find(([headerKey]) => headerKey.toLowerCase() === normalizedKey);
  return normalizeHeaderValue(found?.[1]);
}

export function methodNotAllowed(res: any, allow: string[]): void {
  res.setHeader('Allow', allow.join(', '));
  res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' });
}

export function sendError(res: any, error: unknown): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
    const anyError = error as { status?: number; message?: string; code?: string; details?: unknown };
    res.status(anyError.status ?? 500).json({
      code: anyError.code ?? 'INTERNAL_ERROR',
      message: anyError.message ?? 'Unexpected server error.',
      details: anyError.details,
    });
    return;
  }

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error.',
  });
}
