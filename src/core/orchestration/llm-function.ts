import { LlmCallbackManager } from "./llm-callbacks";
import { BotMessage } from "../../api/chatbot-types";
import { ChatAgentOptions } from "./llm-agent-executor";
import { AssetTree } from "../../commons/types/asset-tree";
import { Dashboard } from "../../commons/types/dashboard-manager";
import { TreeNodeData } from "../../commons/types/tree-node-data";

export interface AppContext {
  assetTree?: AssetTree;
  dashboard?: Dashboard;
  messages?: BotMessage[];
  toggleAssetNodes?: (node: TreeNodeData[]) => void;
}

export interface FunctionContext {
  app: AppContext;
  options: ChatAgentOptions;
}

export interface LlmFunction {
  name: string;
  title: string;
  description: (context: FunctionContext) => string;
}

export interface LlmTool extends LlmFunction {
  type: "tool";
  parameters?: (context: FunctionContext) => any;
  run: (
    context: FunctionContext,
    args: any,
    abortSignal?: AbortSignal,
    callbacks?: LlmCallbackManager
  ) => Promise<string | BotMessage>;
}

export interface LLMAgent extends LlmFunction {
  type: "agent";
  systemMessage?: string;
  plugins: LlmPlugin[];
}

export type LlmPlugin = LlmTool | LLMAgent;
