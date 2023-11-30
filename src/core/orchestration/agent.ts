import {
  BotGenerateRequest,
  BotGenerateResponse,
  BotMessage,
  ChatCompletionMessageToolCall,
} from './bot-types'
import { Callbacks, NullCallbacks } from './callbacks'
import { AssetTree } from '../../commons/types/asset-tree'
import { TreeNodeData } from '../../commons/types/TreeNodeData'
import { generate } from '../../api/chatbot-api'
import { Dashboard } from '../../commons/types/dashboard-manager'
import {PluginSet} from "./llm-function-set";

export interface ChatFunctionContext {
  assetTree?: AssetTree
  dashboard?: Dashboard
  messages?: BotMessage[]

  // TODO: should wrap them in a proper class maybe
  toggleAssetNodes?: (node: TreeNodeData[]) => void
  agentOptions?: ChatAgentOptions
}

const NullContext: ChatFunctionContext = {}


export interface ChatAgentOptions {
  context?: ChatFunctionContext
  maxTurns?: number
  systemMessage?: string
  callbacks?: Callbacks
  abortSignal?: AbortSignal
}

export async function runChatAgent(
  title: string,
  messages: BotMessage[],
  plugins: PluginSet,
  options: ChatAgentOptions = {}
): Promise<BotMessage> {
  const { maxTurns = 5, abortSignal, systemMessage, context = NullContext } = options
  const callbacks = options.callbacks ?? NullCallbacks

  if (systemMessage) {
    messages.unshift({
      role: 'system',
      content: systemMessage,
    })
  }

  let turn = 0
  while (turn < maxTurns) {
    turn++

    if (abortSignal?.aborted) {
      throw new Error('the agent was aborted')
    }

    const generateRequest: BotGenerateRequest = {
      messages: messages,
      functions: plugins.toolMetadata(context),
    }

    callbacks.onWorking?.({
      type: 'working',
      message: `Talking to ${title} agent. Turn: ${turn}`,
      params: generateRequest,
      turn: turn,
    })

    console.log('======================= Sending request to backend =======================')
    console.log('request body', generateRequest)
    const response = await generate(generateRequest, abortSignal)

    let assistantMessage: BotMessage = { role: 'assistant', content: '' }
    let toolCalls: ChatCompletionMessageToolCall[] = []

    const reader = response.body!.getReader()
    const decoder = new TextDecoder('utf-8')
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      // parse data chunks to BotResponses
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n\n')
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const messageText = line.replace('data: ', '').trim()
          if (!messageText) {
            continue
          }
          const message = JSON.parse(messageText) as BotGenerateResponse
          // console.log('Received chunk: ', message)
          if (message.text) {
            assistantMessage.content += message.text
            callbacks.onDelta?.({
              type: 'delta',
              turn: turn,
              message: message.text,
            })
          } else if (message.function_call) {
            toolCalls.push({
              type: 'function',
              id: message.function_call.id,
              function: {
                name: message.function_call.name,
                arguments: JSON.stringify(message.function_call.arguments),
              },
            })
          }
        }
      }
    }
    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls
    }

    callbacks.onSuccess?.({
      type: 'success',
      message: 'Completed LLM call',
      turn: turn,
      params: generateRequest,
      result: assistantMessage,
    })

    messages.push(assistantMessage)

    if (!toolCalls.length) {
      return assistantMessage
    }

    for (const toolCall of toolCalls) {
      if (!plugins) {
        throw new Error('tool call but no functions provided')
      }

      const pluginName = toolCall.function.name
      const plugin = plugins.get(pluginName)
      const pluginArgs = JSON.parse(toolCall.function.arguments)

      const functionCtx: ChatFunctionContext = {
        ...(context || {}),
        messages,
        agentOptions: options,
      }

      callbacks.onWorking?.({
        type: 'working',
        turn: turn,
        message: plugin.type === "agent" ? `Talking to agent ${plugin.title}` : `Calling tool ${plugin.title}`,
        params: pluginArgs,
      })

      let funcResult: any
      try {
        funcResult = await plugin.run(functionCtx, pluginArgs)
        callbacks.onSuccess?.({
          type: 'success',
          message: plugin.type === "agent" ? `Finished talking to agent ${plugin.title}` : `Finished calling tool ${plugin.title}`,
          agent: pluginName,
          params: pluginArgs,
          result: funcResult,
          turn: turn,
        })
      } catch (e: any) {
        callbacks.onError?.({
          type: 'error',
          message: plugin.type === "agent" ? `Error talking to agent ${plugin.title}` : `Error calling tool ${plugin.title}`,
          error: e,
          turn: turn,
          func: pluginName,
          params: pluginArgs,
        })
        // TODO: add a switch to throw instead of continue
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error calling function ${toolCall?.function?.name}: ${e.message}`,
        })
        continue
      }

      // I think the backend does not properly support this for the moment
      const toolMessage: BotMessage = {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: funcResult.content ?? funcResult,
      }

      messages.push(toolMessage)
    }
  }

  throw new Error(`Reached max conversation turns of ${maxTurns}`)
}
