import {
  BotGenerateRequest,
  BotGenerateResponse,
  BotMessage,
  ChatCompletionMessageToolCall,
} from "../../api/chatbot-types";
import { FunctionContext, LLMAgent } from "./llm-function";
import { LlmCallbackManager, LlmTrace } from "./llm-callbacks";
import { PluginSet } from "./llm-function-set";
import { v4 as uuidv4 } from "uuid";
import { generate } from "../../api/chatbot-api";
import { PluginOptions } from "@babel/core";

const DEFAULT_MAX_TURNS = 5;

const DEFAULT_CONTEXT: FunctionContext = {
  app: {},
  options: {
    maxTurns: DEFAULT_MAX_TURNS,
  },
};

export class LlmAgentExecutor {
  private agent: LLMAgent;
  private readonly messages: BotMessage[];
  private readonly plugins: PluginSet;
  private readonly callbackManager: LlmCallbackManager;
  private readonly maxTurns: number;
  private readonly context: FunctionContext;
  private readonly abortSignal?: AbortSignal;
  private readonly parentId?: string;
  private readonly options: PluginOptions;

  static async execute(messages: BotMessage[], agent: LLMAgent, context?: FunctionContext): Promise<BotMessage> {
    const executor = new LlmAgentExecutor(messages, agent, { ...DEFAULT_CONTEXT, ...(context ?? {}) });
    return executor.run();
  }

  private constructor(messages: BotMessage[], agent: LLMAgent, context: FunctionContext) {
    const { options } = context;
    const { maxTurns = DEFAULT_MAX_TURNS, abortSignal } = options;

    this.agent = agent;
    const systemMessage = agent.systemMessage ?? options.systemMessage;
    if (systemMessage) {
      messages.unshift({
        role: "system",
        content: systemMessage,
      });
    }
    this.messages = messages;

    this.callbackManager =
      options.callbacks instanceof LlmCallbackManager
        ? options.callbacks
        : new LlmCallbackManager(agent.name, options.callbacks);
    this.plugins = new PluginSet(agent.plugins, this.callbackManager, abortSignal);

    this.options = options;
    this.parentId = options.parentId;
    this.maxTurns = maxTurns;
    this.abortSignal = abortSignal;
    this.context = context;
  }

  async run(): Promise<BotMessage> {
    let turn = 1;
    while (turn < this.maxTurns) {
      const result = await this.runTurn(turn);
      if (result) {
        return result;
      }
      turn++;
    }
    throw new Error(`Reached max conversation turns of ${this.maxTurns}`);
  }

  private runTurn = async (turn: number) => {
    this.checkAbortSignal();

    const generateRequest = {
      messages: this.messages,
      functions: this.plugins.getDefinitions(this.context),
    };

    const runId = uuidv4();
    const { result, trace } = await this.generate(generateRequest, runId, turn);
    if (!result.tool_calls?.length) {
      await this.callbackManager.emitTrace(trace);
      return result;
    }

    await this.processToolCalls(result.tool_calls, runId, turn);

    this.callbackManager.emitTrace?.(trace);

    return undefined;
  };

  private generate = async (generateRequest: BotGenerateRequest, runId: string, turn: number) => {
    this.callbackManager.emitWorking?.({
      message: `Talking to ${this.agent.title} agent. Turn: ${turn}`,
      params: generateRequest,
      turn: turn,
    });

    const agentTrace = this.newAgentTrace(generateRequest, runId, turn);

    let assistantMessage: BotMessage = { role: "assistant", content: "", tool_calls: [] };
    let toolCalls: ChatCompletionMessageToolCall[] = [];

    const response = await generate(generateRequest, this.abortSignal);
    this.checkAbortSignal();
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
    this.updateAgentTrace(agentTrace, assistantMessage);
    this.callbackManager.addTrace(agentTrace);

    this.messages.push(assistantMessage);

    return {
      result: assistantMessage,
      trace: agentTrace,
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

      const functionCtx: FunctionContext = {
        app: {
          ...this.context.app,
          messages: this.messages,
        },
        options: { ...this.options, parentId: parentId },
      };

      this.callbackManager.emitWorking?.({
        turn: turn,
        message: plugin.type === "agent" ? `Talking to agent ${plugin.title}` : `Calling tool ${plugin.title}`,
        params: pluginArgs,
      });

      let pluginResult: any;
      const pluginTrace = this.newToolTrace(parentId, pluginName, pluginArgs, turn);
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
        this.updateToolTrace(pluginTrace, pluginResult);
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
        this.errorToolTrace(pluginTrace, e);
        continue;
      }

      // I think the backend does not properly support this for the moment
      const toolMessage: BotMessage = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: pluginResult.content ?? pluginResult,
      };

      this.messages.push(toolMessage);
      this.callbackManager.addTrace(pluginTrace);
    }
  };

  private newAgentTrace = (generateReq: BotGenerateRequest, runId: string, turn: number) => {
    return {
      id: runId,
      parentId: this.parentId,
      name: `${this.agent.title} - Turn ${turn}`,
      type: "agent",
      startTime: new Date(),
      inputs: generateReq, // TODO: needs better formatting
      subTraces: [] as LlmTrace[],
    } as LlmTrace;
  };

  private updateAgentTrace = (trace: LlmTrace, assistantMessage: BotMessage) => {
    trace.outputs = assistantMessage;
    trace.endTime = new Date();
    trace.promptTokens = assistantMessage.tokenUsage?.prompt_tokens ?? 0;
    trace.completionTokens = assistantMessage.tokenUsage?.completion_tokens ?? 0;
    trace.totalTokens = assistantMessage.tokenUsage?.total_tokens ?? 0;
    trace.totalPrice = assistantMessage.tokenUsage?.total_price ?? 0;
  };

  private newToolTrace = (parentId: string, pluginName: string, args: any, turn: number) => {
    return {
      id: uuidv4(),
      parentId: parentId,
      name: `${pluginName} - Turn ${turn}`,
      type: "agent",
      startTime: new Date(),
      inputs: args,
      subTraces: [] as LlmTrace[],
    } as LlmTrace;
  };

  private updateToolTrace = (trace: LlmTrace, pluginResult: any) => {
    trace.outputs = pluginResult;
    trace.endTime = new Date();
    trace.promptTokens = pluginResult?.tokenUsage?.prompt_tokens ?? 0;
    trace.completionTokens = pluginResult?.tokenUsage?.completion_tokens ?? 0;
    trace.totalTokens = pluginResult?.tokenUsage?.total_tokens ?? 0;
    trace.totalPrice = pluginResult?.tokenUsage?.total_price ?? 0;
  };

  private errorToolTrace = (trace: LlmTrace, error: any) => {
    trace.endTime = new Date();
    trace.error = error;
  };

  private checkAbortSignal = () => {
    if (this.abortSignal?.aborted) {
      throw new Error("the agent was aborted");
    }
  };
}
