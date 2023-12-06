import { FunctionContext, Tool } from "../llm-function";
import { BotMessage } from "../../../api/chatbot-types";
import { BaseExecutor } from "./base-executor";

export class ToolExecutor extends BaseExecutor {
  private tool: Tool;
  private args: any;

  static execute(tool: Tool, context: FunctionContext, args: any): Promise<string | BotMessage> {
    const executor = new ToolExecutor(tool, context, args);
    return executor.run();
  }

  private constructor(tool: Tool, context: FunctionContext, args: any) {
    super(context);
    this.tool = tool;
    this.args = args;
  }

  private async run(): Promise<string | BotMessage> {
    const trace = this.newPluginTrace(this.parentId, false, this.tool.name, this.args);

    try {
      const result = await this.tool.run(this.context, this.args, this.abortSignal, this.callbackManager);
      this.updateToolTrace(trace, result);
      return result;
    } catch (err) {
      this.errorToolTrace(trace, err);
      throw err;
    }
  }
}
