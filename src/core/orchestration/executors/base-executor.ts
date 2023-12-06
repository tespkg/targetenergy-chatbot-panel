// TODO: to be implemented
import { v4 as uuidv4 } from "uuid";
import { LlmCallbackManager, LlmTrace } from "../llm-callbacks";
import { FunctionContext, PluginOptions } from "../llm-function";

export abstract class BaseExecutor {
  protected context: FunctionContext;
  protected options: PluginOptions;
  protected callbackManager: LlmCallbackManager;
  protected parentId: string;
  protected abortSignal?: AbortSignal;

  constructor(context: FunctionContext) {
    this.context = context;
    this.options = context.options;
    this.callbackManager = context.options.callbacks as LlmCallbackManager;
    this.parentId = this.options.parentId!;
    this.abortSignal = this.options.abortSignal;
  }

  protected newPluginTrace = (parentId: string, isAgent: boolean, pluginName: string, args: any) => {
    const trace = {
      id: uuidv4(),
      parentId: parentId,
      name: isAgent ? `${pluginName} Agent` : `${pluginName} Tool`,
      type: "tool",
      startTime: new Date(),
      inputs: args,
      subTraces: [] as LlmTrace[],
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalPrice: 0,
      },
      aggregatedTokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalPrice: 0,
      },
    } as LlmTrace;
    this.callbackManager.addTrace(trace);
    return trace;
  };

  protected updateToolTrace = (trace: LlmTrace, pluginResult: any) => {
    trace.outputs = pluginResult;
    trace.endTime = new Date();
    trace.tokenUsage.promptTokens = pluginResult?.tokenUsage?.prompt_tokens ?? 0;
    trace.tokenUsage.completionTokens = pluginResult?.tokenUsage?.completion_tokens ?? 0;
    trace.tokenUsage.totalTokens = pluginResult?.tokenUsage?.total_tokens ?? 0;
    trace.tokenUsage.totalPrice = pluginResult?.tokenUsage?.total_price ?? 0;
    this.callbackManager.updateTrace(trace);
  };

  protected errorToolTrace = (trace: LlmTrace, error: any) => {
    trace.endTime = new Date();
    trace.error = error;
  };
}
