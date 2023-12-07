import {
  BotGenerateRequest,
  BotGenerateResponse,
  BotMessage,
  ChatCompletionMessageToolCall,
} from "../../../api/chatbot-types";
import { FunctionContext, LlmAgent, PluginResult, stringPluginResult } from "../llm-function";
import { PluginSet } from "../llm-function-set";
import { generate } from "../../../api/chatbot-api";
import { MaxTurnExceededError } from "../llm-errors";

import { BaseExecutor } from "./base-executor";

const DEFAULT_MAX_TURNS = 10;

const DEFAULT_CONTEXT: FunctionContext = {
  app: {},
  options: {
    maxTurns: DEFAULT_MAX_TURNS,
  },
};

export class LlmAgentExecutor extends BaseExecutor {
  private agent: LlmAgent;
  private readonly messages: BotMessage[];
  private readonly plugins: PluginSet;
  private readonly maxTurns: number;

  static async execute(messages: BotMessage[], agent: LlmAgent, context?: FunctionContext): Promise<PluginResult> {
    const executor = new LlmAgentExecutor(messages, agent, { ...DEFAULT_CONTEXT, ...(context ?? {}) });
    return executor.run();
  }

  private constructor(messages: BotMessage[], agent: LlmAgent, context: FunctionContext) {
    super(context, agent);
    const { options } = context;
    const { maxTurns = DEFAULT_MAX_TURNS } = options;

    this.agent = agent;
    this.plugins = new PluginSet(agent.plugins, this.callbackManager, this.abortSignal);
    this.parentId = options.parentId;
    this.maxTurns = maxTurns;

    const systemMessage = agent.systemMessage ?? options.systemMessage;
    if (systemMessage) {
      messages.unshift({
        role: "system",
        content: systemMessage.trim(),
      });
    }
    this.messages = messages;
  }

  protected async run(): Promise<PluginResult> {
    let turn = 1;
    while (turn < this.maxTurns) {
      const result = await this.runTurn(turn);
      if (result) {
        return result;
      }
      turn++;
    }
    throw new MaxTurnExceededError(this.maxTurns);
  }

  private runTurn = async (turn: number) => {
    this.checkAbortSignal();

    const generateRequest = {
      messages: [...this.messages],
      functions: this.plugins.getDefinitions(this.context),
    };

    const { result, trace } = await this.generate(generateRequest, turn);
    if (!result.tool_calls?.length) {
      await this.callbackManager.emitTrace(trace);
      return result;
    }

    await this.processToolCalls(result.tool_calls, trace.id, turn);

    this.callbackManager.emitTrace?.(trace);

    return undefined;
  };

  private generate = async (generateRequest: BotGenerateRequest, turn: number) => {
    this.callbackManager.emitWorking?.({
      message: `Talking to ${this.agent.title} agent. Turn: ${turn}`,
      params: generateRequest,
      turn: turn,
      isAgent: true,
    });

    const trace = this.newTrace(generateRequest, turn);

    let assistantMessage: BotMessage = { role: "assistant", content: "", tool_calls: [] };
    let toolCalls: ChatCompletionMessageToolCall[] = [];

    let response: Response;
    try {
      response = await generate(generateRequest, this.abortSignal);
    } catch (error) {
      // If the request was cancelled because of the abortSignal, `checkAbortSignal` will throw a custom exception
      // Otherwise we rethrow the original error
      this.checkAbortSignal();
      throw error;
    }
    const reader = response.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
      this.checkAbortSignal();
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // parse data chunks to BotResponses
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const messageText = line.replace("data: ", "").trim();
          if (!messageText) {
            continue;
          }
          const message = JSON.parse(messageText) as BotGenerateResponse;
          // console.log('Received chunk: ', message)
          if (message.text) {
            assistantMessage.content += message.text;
            this.callbackManager.emitDelta?.({
              turn: turn,
              message: message.text,
            });
          } else if (message.function_call) {
            toolCalls.push({
              type: "function",
              id: message.function_call.id,
              function: {
                name: message.function_call.name,
                arguments: JSON.stringify(message.function_call.arguments),
              },
            });
          } else if (message.token_usage) {
            assistantMessage.tokenUsage = message.token_usage;
          }
        }
      }
    }

    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls;
    }

    this.callbackManager.emitSuccess?.({
      message: "Completed LLM call",
      turn: turn,
      params: generateRequest,
      result: assistantMessage,
    });
    this.updateTrace(trace, assistantMessage);

    this.messages.push(assistantMessage);

    return {
      result: assistantMessage,
      trace: trace,
    };
  };

  private processToolCalls = async (toolCalls: ChatCompletionMessageToolCall[], parentId: string, turn: number) => {
    for (const toolCall of toolCalls) {
      this.checkAbortSignal();
      if (!this.plugins) {
        throw new Error("tool call but no plugins were provided");
      }

      const pluginName = toolCall.function.name;
      const plugin = this.plugins.get(pluginName);
      const pluginArgs = JSON.parse(toolCall.function.arguments);

      // const pluginTrace = this.newPluginTrace(parentId, plugin.type === "agent", plugin.title, pluginArgs);

      const functionCtx: FunctionContext = {
        app: {
          ...this.context.app,
          messages: this.messages,
        },
        options: { ...this.options, parentId: parentId },
      };

      this.callbackManager.emitWorking?.({
        turn: turn,
        message: plugin.type === "agent" ? `Talking to agent1 ${plugin.title}` : `Calling tool1 ${plugin.title}`,
        params: pluginArgs,
        isAgent: plugin.type === "agent",
        tool: plugin.type === "tool" ? plugin.title : undefined,
      });

      let pluginResult: PluginResult;
      try {
        pluginResult = await plugin.run(functionCtx, pluginArgs);
        this.callbackManager.emitSuccess?.({
          message:
            plugin.type === "agent"
              ? `Finished talking to agent ${plugin.title}`
              : `Finished calling tool ${plugin.title}`,
          // agent: pluginName, TODO:
          params: pluginArgs,
          result: pluginResult,
          turn: turn,
        });
        // this.updateToolTrace(pluginTrace, pluginResult);
      } catch (e: any) {
        this.callbackManager.emitError?.({
          message:
            plugin.type === "agent" ? `Error talking to agent ${plugin.title}` : `Error calling tool ${plugin.title}`,
          error: e,
          turn: turn,
          func: pluginName,
          params: pluginArgs,
        });
        // TODO: add a switch to throw instead of continue
        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error calling function ${toolCall?.function?.name}: ${e.message}`,
        });
        // this.errorToolTrace(pluginTrace, e);
        continue;
      }

      // I think the backend does not properly support this for the moment
      const toolMessage: BotMessage = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: stringPluginResult(pluginResult),
      };

      this.messages.push(toolMessage);
    }
  };
}
