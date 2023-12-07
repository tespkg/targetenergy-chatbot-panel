import { v4 as uuidv4 } from "uuid";
import { LlmCallbackManager, LlmTrace } from "../llm-callbacks";
import { FunctionContext, PluginOptions, Plugin, PluginResult } from "../llm-function";
import { OperationCancelledError } from "../../../commons/errors/operation-cancelled-error";

export abstract class BaseExecutor {
  protected context: FunctionContext;
  protected options: PluginOptions;
  protected callbackManager: LlmCallbackManager;
  protected parentId?: string;
  protected abortSignal?: AbortSignal;
  protected readonly plugin: Plugin;

  protected constructor(context: FunctionContext, plugin: Plugin) {
    this.context = context;
    this.options = context.options;
    this.callbackManager =
      this.options.callbacks instanceof LlmCallbackManager
        ? this.options.callbacks
        : new LlmCallbackManager(plugin.name, this.options.callbacks);
    this.parentId = this.options.parentId;
    this.abortSignal = this.options.abortSignal;
    this.plugin = plugin;
  }

  protected abstract run(): Promise<PluginResult>;

  protected newTrace = (args: any, turn?: number) => {
    const isAgent = this.plugin.type === "agent";
    const pluginName = this.plugin.name;
    let traceName = isAgent ? `${pluginName} Agent` : `${pluginName} Tool`;
    traceName = turn ? `${traceName} - (Turn ${turn})` : traceName;
    const trace = {
      id: uuidv4(),
      parentId: this.parentId,
      name: traceName,
      type: isAgent ? "agent" : "tool",
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

  protected updateTrace = (trace: LlmTrace, pluginResult: any) => {
    trace.outputs = pluginResult;
    trace.endTime = new Date();
    trace.tokenUsage.promptTokens = pluginResult?.tokenUsage?.prompt_tokens ?? 0;
    trace.tokenUsage.completionTokens = pluginResult?.tokenUsage?.completion_tokens ?? 0;
    trace.tokenUsage.totalTokens = pluginResult?.tokenUsage?.total_tokens ?? 0;
    trace.tokenUsage.totalPrice = pluginResult?.tokenUsage?.total_price ?? 0;
    this.callbackManager.updateTrace(trace);
  };

  protected errorTrace = (trace: LlmTrace, error: any) => {
    trace.endTime = new Date();
    trace.error = error;
  };

  protected checkAbortSignal = () => {
    if (this.abortSignal?.aborted) {
      throw new OperationCancelledError("the agent was cancelled");
    }
  };
}
