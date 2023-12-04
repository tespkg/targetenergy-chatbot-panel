export class OperationCancelledError extends Error {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OperationCancelledError);
    }
  }
}
