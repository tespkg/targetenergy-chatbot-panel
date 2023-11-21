import {
  BotFunctionDefinition,
  BotGenerateRequest,
  BotGenerateResponse,
  BotMessage,
  ChatCompletionMessageToolCall,
} from './bot-types'
import { agentCallbacks, Callbacks, NullCallbacks } from './callbacks'
import { AssetTree } from '../commons/utils/asset-tree'
import { TreeNodeData } from '../commons/types/TreeNodeData'
import { generate } from './chatbot-api'

export interface ChatFunctionContext {
  assetTree?: AssetTree
  messages?: BotMessage[]

  // TODO: should wrap them in a proper class maybe
  toggleAssetNodes?: (node: TreeNodeData[]) => void
  agentOptions?: ChatAgentOptions
}
const NullContext: ChatFunctionContext = {}

export type ChatFunction = {
  name: string
  description: (context: ChatFunctionContext) => string
  parameters?: (context: ChatFunctionContext) => any
  isAgent?: boolean
  run: (
    context: ChatFunctionContext,
    args: any,
    abortSignal?: AbortSignal,
    callbacks?: Callbacks
  ) => Promise<string | BotMessage>
}

export class ChatFunctionSet {
  functions: ChatFunction[] = []
  abortSignal?: AbortSignal
  callbacks?: Callbacks

  constructor(functions: ChatFunction[] = [], abortSignal?: AbortSignal, callbacks?: Callbacks) {
    this.functions = functions
    this.abortSignal = abortSignal
    this.callbacks = callbacks
  }

  get(name: string) {
    const func = this.functions.find((f) => f.name === name)
    if (!func) {
      throw new Error(`Unknown function: ${name}`)
    }
    const abortSignal = this.abortSignal
    let callbacks = this.callbacks
    if (func.isAgent) {
      callbacks = agentCallbacks(func.name, callbacks)
    }
    return (context: ChatFunctionContext, args: any) => {
      return func.run(context, args, abortSignal, callbacks)
    }
  }

  metadata(context: ChatFunctionContext) {
    return this.functions.map((f) => ({
      name: f.name,
      description: f.description(context),
      parameters: f.parameters ? f.parameters(context) : null,
    }))
  }

  toolMetadata(context: ChatFunctionContext): BotFunctionDefinition[] {
    return this.functions.map((f) => ({
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

export interface ChatAgentOptions {
  context?: ChatFunctionContext
  maxTurns?: number
  systemMessage?: string
  callbacks?: Callbacks
  abortSignal?: AbortSignal
}

export async function runChatAgent(
  messages: BotMessage[],
  functionSet: ChatFunctionSet,
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

  let turns = 0
  while (turns < maxTurns) {
    turns++

    if (abortSignal?.aborted) {
      throw new Error('the agent was aborted')
    }

    const generateRequest: BotGenerateRequest = {
      messages: messages,
      functions: functionSet.toolMetadata(context),
    }

    callbacks.onWorking?.({
      type: 'working',
      message: `Turn ${turns}: calling reasoning engine from large language model`,
      params: generateRequest,
      turn: turns,
    })

    console.log('======================= Sending request to backend =======================')

    // TODO: maybe need retry
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
              turn: turns,
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
      message: 'Completed llm call',
      turn: turns,
      params: generateRequest,
      result: assistantMessage,
    })

    messages.push(assistantMessage)

    if (!toolCalls.length) {
      return assistantMessage
    }

    for (const toolCall of toolCalls) {
      if (!functionSet) {
        throw new Error('tool call but no functions provided')
      }

      const funcName = toolCall.function.name
      const func = functionSet.get(funcName)
      const funcArgs = JSON.parse(toolCall.function.arguments)

      const functionCtx: ChatFunctionContext = {
        ...(context || {}),
        messages,
        agentOptions: options,
      }

      callbacks.onWorking?.({
        type: 'working',
        agent: funcName,
        turn: turns,
        message: `Calling function ${funcName}`,
        params: funcArgs,
      })

      let funcResult: any
      try {
        funcResult = await func(functionCtx, funcArgs)
        callbacks.onSuccess?.({
          type: 'success',
          message: `Finished calling function ${funcName}`,
          agent: funcName,
          params: funcArgs,
          result: funcResult,
          turn: turns,
        })
      } catch (e: any) {
        callbacks.onError?.({
          type: 'error',
          message: '',
          error: e,
          turn: turns,
          func: funcName,
          params: funcArgs,
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

      // const toolMessage: BotMessage = {
      //   role: 'assistant',
      //   content: funcResult.result ?? funcResult,
      // }

      messages.push(toolMessage)
    }
  }

  throw new Error(`Reached max conversation turns of ${maxTurns}`)
}
