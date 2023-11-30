import { BotMessage } from '../orchestration/bot-types'
import { ChatAgentOptions, runChatAgent } from '../orchestration/agent'
import { createSystemMessage } from '../../api/system-message'
import { assetTreeAgent } from './asset-tree-agent'
import { agentCallbacks, ROOT_AGENT_NAME, NullCallbacks } from '../orchestration/callbacks'
import { panelManagerAgent } from './panel-manager-agent'
import { PluginSet } from '../orchestration/llm-function-set'

export async function runAgents(messages: BotMessage[], options: ChatAgentOptions = {}) {
  if (!options.systemMessage && options.context?.assetTree) {
    options.systemMessage = createSystemMessage(options.context.assetTree)
  }

  options.callbacks = agentCallbacks(ROOT_AGENT_NAME, options.callbacks ?? NullCallbacks)!

  const plugins = new PluginSet([assetTreeAgent, panelManagerAgent], options.abortSignal, options.callbacks)

  const result = await runChatAgent('Main', messages, plugins, options)

  return result.content
}
