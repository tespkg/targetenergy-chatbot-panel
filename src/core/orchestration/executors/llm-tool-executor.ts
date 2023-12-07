import { FunctionContext, LlmTool, PluginResult } from "../llm-function";
import { BotGenerateResponse, BotMessage } from "../../../api/chatbot-types";
import { generate } from "../../../api/chatbot-api";
import { BaseExecutor } from "./base-executor";

export class LlmToolExecutor extends BaseExecutor {
  private readonly tool: LlmTool;
  private readonly args: any;

  static execute(context: FunctionContext, tool: LlmTool, args: any): Promise<PluginResult> {
    const executor = new LlmToolExecutor(context, tool, args);
    return executor.run();
  }

  constructor(context: FunctionContext, tool: LlmTool, args: any) {
    super(context, tool);
    this.tool = tool;
    this.args = args;
  }

  protected async run(): Promise<PluginResult> {
    const messages = await this.tool.getMessages(this.context, this.args);

    if (messages.length === 0) {
      throw new Error(`Tool ${this.tool.name} did not return any messages`);
    }

    const generateRequest = {
      messages: [...messages],
      functions: [],
    };

    const trace = this.newTrace(this.args);

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
      this.errorTrace(trace, error);
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

    this.updateTrace(trace, assistantMessage);

    return assistantMessage;
  }
}
