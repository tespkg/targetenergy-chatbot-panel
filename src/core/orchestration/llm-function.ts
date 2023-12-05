import { LlmCallbackManager, LlmCallbacks } from "./llm-callbacks";
import { BotMessage } from "../../api/chatbot-types";
import { AssetTree } from "../../commons/types/asset-tree";
import { Dashboard } from "../../commons/types/dashboard-manager";
import { TreeNodeData } from "../../commons/types/tree-node-data";

/**
 * Application specific context. This is passed to plugins and tools and be used to provide
 * access to application specific data and functionality.
 */
export interface AppContext {
  assetTree?: AssetTree;
  dashboard?: Dashboard;
  messages?: BotMessage[];
  toggleAssetNodes?: (node: TreeNodeData[]) => void;
}

/**
 * The options for the LLM plugin.
 */
export interface PluginOptions {
  /**
   * The maximum number of turns the LLM can run.
   */
  maxTurns?: number;

  /**
   * The system message to use before the first user message.
   */
  systemMessage?: string;

  /**
   * The callbacks to use for the LLM. Can be used to listen to the events from the execution engine.
   *
   * If not provided, a new callback manager will be created.
   */
  callbacks?: LlmCallbackManager | LlmCallbacks;

  /**
   * The abort signal. Can be used to abort the execution of the plugins.
   */
  abortSignal?: AbortSignal;

  /**
   * The parent agent id.
   */
  parentId?: string;
}

/**
 * Represents the application context and .
 */
export interface FunctionContext {
  app: AppContext;
  options: PluginOptions;
}

/**
 * Represents a function that can be executed by the LLM.
 */
export interface LlmFunction {
  name: string;
  title: string;
  description: (context: FunctionContext) => string;
}

/**
 * Represents a tool that can be executed.
 */
export interface Tool extends LlmFunction {
  type: "tool";
  parameters?: (context: FunctionContext) => any;
  run: (
    context: FunctionContext,
    args: any,
    abortSignal?: AbortSignal,
    callbacks?: LlmCallbackManager
  ) => Promise<string | BotMessage>;
}

/**
 * Represents a tool that can be executed by the LLM.
 */
export interface LlmTool extends LlmFunction {
  type: "llm-tool";
  parameters?: (context: FunctionContext) => any;
  getMessages: (context: FunctionContext, args: any) => Promise<BotMessage[]>;
}

/**
 * Represents an agent that can be executed by the LLM.
 */
export interface LlmAgent extends LlmFunction {
  type: "agent";
  systemMessage?: string;
  plugins: Plugin[];
}

export type Plugin = Tool | LlmTool | LlmAgent;
