import { FunctionContext, PluginResult, Tool } from "../llm-function";
import { BotMessage } from "../../../api/chatbot-types";
import { BaseExecutor } from "./base-executor";

export class ToolExecutor extends BaseExecutor {
  private readonly tool: Tool;
  private readonly args: any;

  static execute(context: FunctionContext, tool: Tool, args: any): Promise<PluginResult> {
    const executor = new ToolExecutor(context, tool, args);
    return executor.run();
  }

  constructor(context: FunctionContext, tool: Tool, args: any) {
    super(context, tool);
    this.tool = tool;
    this.args = args;
  }

  protected async run(): Promise<string | BotMessage> {
    const trace = this.newTrace(this.args);

    try {
      const result = await this.tool.run(this.context, this.args, this.abortSignal, this.callbackManager);
      this.updateTrace(trace, result);
      return result;
    } catch (err) {
      this.errorTrace(trace, err);
      throw err;
    }
  }
}
