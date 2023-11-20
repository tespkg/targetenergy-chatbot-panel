export interface BotFunctionExecutionContext {
  addIntent(intent: string): void
}

export interface BotFunctionArgs {
  context?: BotFunctionExecutionContext
}

export const NullBotFunctionContext: BotFunctionExecutionContext = {
  addIntent(intent: string) {
    // do nothing
  },
}
