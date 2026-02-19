export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'CONCURRENCY_CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'IDEMPOTENCY_CONFLICT';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(params: { status: number; code: ApiErrorCode; message: string; details?: unknown }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}
