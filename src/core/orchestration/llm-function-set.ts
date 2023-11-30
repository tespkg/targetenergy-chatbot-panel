import { LlmCallbackManager } from './llm-callbacks'
import { BotFunctionDefinition, BotMessage } from '../../api/chatbot-types'
import { ChatFunctionContext, runAgent } from './llm-orchestrator'
import { LLMAgent, LlmPlugin } from './llm-function'

export const DEFAULT_AGENT_PARAMETERS = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      description: `The question to ask, including any context that's important to the question from the conversation`,
    },
  },
  required: ['question'],
}

export class PluginSet {
  plugins: LlmPlugin[] = []
  callbackManager: LlmCallbackManager
  abortSignal?: AbortSignal

  constructor(plugins: LlmPlugin[] = [], callbackManager: LlmCallbackManager, abortSignal?: AbortSignal) {
    this.plugins = plugins
    this.callbackManager = callbackManager
    this.abortSignal = abortSignal
  }

  get(name: string) {
    const plugin = this.plugins.find((f) => f.name === name)
    if (!plugin) {
      throw new Error(`Unknown function: ${name}`)
    }
    return {
      type: plugin.type,
      title: plugin.title,
      run: this.runPlugin(plugin),
    }
  }

  getDefinitions(context: ChatFunctionContext): BotFunctionDefinition[] {
    return this.plugins.map((plugin) => this.getPluginDefinition(plugin, context))
  }

  private runPlugin(plugin: LlmPlugin) {
    return (context: ChatFunctionContext, args: any) => {
      switch (plugin.type) {
        case 'agent':
          const { question } = args
          const agent = plugin as LLMAgent
          const messages: BotMessage[] = [
            {
              role: 'user',
              content: question as string,
            },
          ]
          return runAgent(messages, agent, {
            abortSignal: this.abortSignal,
            callbacks: this.callbackManager.forAgent(agent.name),
            context,
          })
        case 'tool':
          return plugin.run(context, args, this.abortSignal, this.callbackManager)
      }
    }
  }

  private getPluginDefinition(plugin: LlmPlugin, context: ChatFunctionContext) {
    switch (plugin.type) {
      case 'agent':
        return {
          name: plugin.name,
          description: plugin.description(context),
          parameters: DEFAULT_AGENT_PARAMETERS,
        }
      case 'tool':
        return {
          name: plugin.name,
          description: plugin.description(context),
          parameters: plugin.parameters
            ? plugin.parameters(context)
            : {
                type: 'object',
                properties: {},
              },
        }
    }
  }
}
