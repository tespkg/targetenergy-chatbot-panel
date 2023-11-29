import {Callbacks} from "./callbacks";
import {BotMessage} from "./bot-types";
import {ChatFunctionContext} from "./agent";

export interface LlmFunction {
    name: string
    title: string
    description: (context: ChatFunctionContext) => string
    parameters?: (context: ChatFunctionContext) => any
    run: (
        context: ChatFunctionContext,
        args: any,
        abortSignal?: AbortSignal,
        callbacks?: Callbacks
    ) => Promise<string | BotMessage>
}

export interface LlmTool extends LlmFunction {
    type: "tool"
}

export interface LLMAgent extends LlmFunction {
    type: "agent"
}

export type LlmPlugin = LlmTool | LLMAgent
