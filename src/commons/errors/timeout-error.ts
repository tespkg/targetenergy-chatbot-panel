export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}
