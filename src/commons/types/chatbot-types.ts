export interface ChatCommandContext {
  addIntent(intent: string): void
}

export interface ChatCommandArgs {
  context?: ChatCommandContext
}

export const NullChatCommandContext: ChatCommandContext = {
  addIntent(intent: string) {
    // do nothing
  },
}
