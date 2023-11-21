import { BotMessage } from '../api/bot-types'
import { ChatAgentOptions, ChatFunctionSet, runChatAgent } from '../api/chatbot-agent'
import { createSystemMessage } from '../api/system-message'
import { assetTreeAgent } from './asset-tree-agent'
import { agentCallbacks, ROOT_AGENT_NAME, NullCallbacks } from '../api/callbacks'
import { panelManagerAgent } from './panel-manager-agent'

export async function runAgents(messages: BotMessage[], options: ChatAgentOptions = {}) {
  if (!options.systemMessage && options.context?.assetTree) {
    options.systemMessage = createSystemMessage(options.context.assetTree)
  }

  options.callbacks = agentCallbacks(ROOT_AGENT_NAME, options.callbacks ?? NullCallbacks)!

  const functionSet = new ChatFunctionSet([assetTreeAgent, panelManagerAgent], options.abortSignal, options.callbacks)

  const result = await runChatAgent(messages, functionSet, options)

  return result.content
}
