import { FunctionContext, LlmTool, PluginOptions } from "./llm-function";
import { LlmCallbackManager, LlmTrace } from "./llm-callbacks";
import { BotGenerateResponse, BotMessage } from "../../api/chatbot-types";
import { OperationCancelledError } from "../../commons/errors/operation-cancelled-error";
import { generate } from "../../api/chatbot-api";
import { v4 as uuidv4 } from "uuid";

export class LlmToolExecutor {
  private tool: LlmTool;
  private context: FunctionContext;
  private args: any;
  private callbackManager: LlmCallbackManager;
  private options: PluginOptions;
  private parentId: string;
  private abortSignal?: AbortSignal;

  static execute(tool: LlmTool, context: FunctionContext, args: any): Promise<BotMessage> {
    const executor = new LlmToolExecutor(tool, context, args);
    return executor.run();
  }

  private constructor(tool: LlmTool, context: FunctionContext, args: any) {
    this.tool = tool;
    this.context = context;
    this.args = args;

    this.options = context.options;
    this.callbackManager = context.options.callbacks as LlmCallbackManager;
    this.parentId = this.options.parentId!;
    this.abortSignal = this.options.abortSignal;
  }

  private async run(): Promise<BotMessage> {
    const messages = await this.tool.getMessages(this.context, this.args);

    if (messages.length === 0) {
      throw new Error(`Tool ${this.tool.name} did not return any messages`);
    }

    const generateRequest = {
      messages: [...messages],
      functions: [],
    };

    this.callbackManager.emitWorking?.({
      message: `Calling ${this.tool.title} agent.`,
      params: generateRequest,
    });

    let assistantMessage: BotMessage = { role: "assistant", content: "", tool_calls: [] };

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
          } else if (message.token_usage) {
            assistantMessage.tokenUsage = message.token_usage;
          }
        }
      }
    }

    this.callbackManager.emitSuccess?.({
      message: "Completed calling LLM Tool",
      params: generateRequest,
      result: assistantMessage,
    });

    this.newToolTrace(this.parentId!, this.tool.name, this.args);

    return assistantMessage;
  }

  private newToolTrace = (parentId: string, pluginName: string, args: any) => {
    const trace = {
      id: uuidv4(),
      parentId: parentId,
      name: `${pluginName} Tool`,
      type: "tool",
      startTime: new Date(),
      inputs: args,
      subTraces: [] as LlmTrace[],
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalPrice: 0,
    } as LlmTrace;
    this.callbackManager.addTrace(trace);
    return trace;
  };

  private checkAbortSignal = () => {
    if (this.abortSignal?.aborted) {
      throw new OperationCancelledError("the agent was cancelled");
    }
  };
}
