import { BotMessage } from './bot-types'
import { ChatAgentOptions, ChatFunctionSet, runChatAgent } from './chatbot-agent'
import { createSystemMessage } from '../api/system-message'
import { assetTreeAgent } from './asset-tree-agent'
import { agentCallbacks, ROOT_AGENT_NAME, NullCallbacks } from './callbacks'
import { panelManagerAgent } from './panel-manager-agent'

export async function runAgents(messages: BotMessage[], options: ChatAgentOptions = {}) {
  if (!options.systemMessage && options.context?.assetTree) {
    options.systemMessage = createSystemMessage(options.context.assetTree)
  }

  options.callbacks = agentCallbacks(ROOT_AGENT_NAME, options.callbacks ?? NullCallbacks)!

  const functionSet = new ChatFunctionSet([assetTreeAgent, panelManagerAgent], options.abortSignal, options.callbacks)

  const result = await runChatAgent('Main', messages, functionSet, options)

  return result.content
}
