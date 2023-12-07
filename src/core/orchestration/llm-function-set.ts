import { LlmCallbackManager } from "./llm-callbacks";
import { BotFunctionDefinition, BotMessage } from "../../api/chatbot-types";
import { FunctionContext, LlmAgent, Plugin } from "./llm-function";
import { LlmAgentExecutor } from "./executors/llm-agent-executor";
import { LlmToolExecutor } from "./executors/llm-tool-executor";
import { ToolExecutor } from "./executors/tool-executor";

export const DEFAULT_AGENT_PARAMETERS = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: `The question to ask, including any context that's important to the question from the conversation`,
    },
  },
  required: ["question"],
};

export class PluginSet {
  plugins: Plugin[] = [];
  callbackManager: LlmCallbackManager;
  abortSignal?: AbortSignal;

  constructor(plugins: Plugin[] = [], callbackManager: LlmCallbackManager, abortSignal?: AbortSignal) {
    this.plugins = plugins;
    this.callbackManager = callbackManager;
    this.abortSignal = abortSignal;
  }

  get(name: string) {
    const plugin = this.plugins.find((f) => f.name === name);
    if (!plugin) {
      throw new Error(`Unknown function: ${name}`);
    }
    return {
      type: plugin.type,
      title: plugin.title,
      run: this.runPlugin(plugin),
    };
  }

  getDefinitions(context: FunctionContext): BotFunctionDefinition[] {
    return this.plugins.map((plugin) => this.getPluginDefinition(plugin, context));
  }

  private runPlugin(plugin: Plugin) {
    return (context: FunctionContext, args: any) => {
      switch (plugin.type) {
        case "agent":
          const { question } = args;
          const agent = plugin as LlmAgent;
          const messages: BotMessage[] = [
            {
              role: "user",
              content: question as string,
            },
          ];
          return LlmAgentExecutor.execute(messages, agent, {
            ...context,
            options: {
              ...context.options,
              callbacks: this.callbackManager.forAgent(agent.name),
              abortSignal: this.abortSignal,
            },
          });
        case "tool":
          return ToolExecutor.execute(
            {
              ...context,
              options: {
                ...context.options,
                callbacks: this.callbackManager,
                abortSignal: this.abortSignal,
              },
            },
            plugin,
            args
          );
        case "llm-tool":
          return LlmToolExecutor.execute(
            {
              ...context,
              options: {
                ...context.options,
                callbacks: this.callbackManager,
                abortSignal: this.abortSignal,
              },
            },
            plugin,
            args
          );
      }
    };
  }

  private getPluginDefinition(plugin: Plugin, context: FunctionContext) {
    switch (plugin.type) {
      case "agent":
        return {
          name: plugin.name,
          description: plugin.description(context),
          parameters: DEFAULT_AGENT_PARAMETERS,
        };
      case "tool":
      case "llm-tool":
        return {
          name: plugin.name,
          description: plugin.description(context),
          parameters: plugin.parameters
            ? plugin.parameters(context)
            : {
                type: "object",
                properties: {},
              },
        };
    }
  }
}
