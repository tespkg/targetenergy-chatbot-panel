import { agentCallbacks, Callbacks } from './callbacks'
import { BotFunctionDefinition } from './bot-types'
import { ChatFunctionContext } from './agent'
import { LlmPlugin } from './llm-function'

export class PluginSet {
  plugins: LlmPlugin[] = []
  abortSignal?: AbortSignal
  callbacks?: Callbacks

  constructor(plugins: LlmPlugin[] = [], abortSignal?: AbortSignal, callbacks?: Callbacks) {
    this.plugins = plugins
    this.abortSignal = abortSignal
    this.callbacks = callbacks
  }

  get(name: string) {
    const func = this.plugins.find((f) => f.name === name)
    if (!func) {
      throw new Error(`Unknown function: ${name}`)
    }
    const abortSignal = this.abortSignal
    let callbacks = this.callbacks
    if (func.type === 'agent') {
      callbacks = agentCallbacks(func.name, callbacks)
    }
    return {
      run: (context: ChatFunctionContext, args: any) => {
        return func.run(context, args, abortSignal, callbacks)
      },
      type: func.type,
      title: func.title,
    }
  }

  toolMetadata(context: ChatFunctionContext): BotFunctionDefinition[] {
    return this.plugins.map((f) => ({
      name: f.name,
      description: f.description(context),
      parameters: f.parameters
        ? f.parameters(context)
        : {
            type: 'object',
            properties: {},
          },
    }))
  }
}
