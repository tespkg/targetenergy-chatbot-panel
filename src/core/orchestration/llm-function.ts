import { LlmCallbackManager } from './llm-callbacks'
import { BotMessage } from '../../api/chatbot-types'
import { ChatFunctionContext } from './llm-orchestrator'

export interface LlmFunction {
  name: string
  title: string
  description: (context: ChatFunctionContext) => string
}

export interface LlmTool extends LlmFunction {
  type: 'tool'
  parameters?: (context: ChatFunctionContext) => any
  run: (
    context: ChatFunctionContext,
    args: any,
    abortSignal?: AbortSignal,
    callbacks?: LlmCallbackManager
  ) => Promise<string | BotMessage>
}

export interface LLMAgent extends LlmFunction {
  type: 'agent'
  systemMessage?: string
  plugins: LlmPlugin[]
}

export type LlmPlugin = LlmTool | LLMAgent
