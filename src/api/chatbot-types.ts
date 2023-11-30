export interface BotFunctionCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface BotGenerateResponse {
  text?: string
  audio_transcription?: string
  function_call?: BotFunctionCall
  err: string
}

export interface BotFunctionParameter {
  type: string
  properties: any
  required: string[]
}

export interface BotFunctionDefinition {
  name: string
  description: string
  parameters: BotFunctionParameter
}

export interface ToolCallFunctionDescription {
  arguments: string
  name: string
}

export interface ChatCompletionMessageToolCall {
  id: string
  function: ToolCallFunctionDescription
  type: 'function'
}

export interface BotMessage {
  content: string
  role: string
  tool_call_id?: string
  tool_calls?: ChatCompletionMessageToolCall[]
}

export interface BotGenerateRequest {
  functions: BotFunctionDefinition[]
  messages: BotMessage[]
}

export interface TextToSpeechRequest {
  text: string
  stream?: boolean
}
