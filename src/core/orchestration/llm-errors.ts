export class MaxTurnExceededError extends Error {
  constructor(maxTurns: number) {
    super(`Reached max conversation turns of ${maxTurns}`);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MaxTurnExceededError);
    }
  }
}
