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
    properties: any,
    required: string[]
}

export interface BotFunctionDefinition {
    name: string
    description: string
    parameters: BotFunctionParameter
}

export interface BotMessage {
    content: string
    role: string
}

export interface BotGenerateRequest {
    functions: BotFunctionDefinition[]
    messages: BotMessage[]
}
