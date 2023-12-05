import { LlmAgent, Tool } from "../orchestration/llm-function";

const choosePanelTool: Tool = {
  type: "tool",
  name: "choose_panel",
  title: "Choose Panel",
  description: (_) => "Chooses a panel for analysis based on user request",
  parameters: (_) => ({
    type: "object",
    properties: {
      panel_name: {
        type: "string",
        description: "Panel name to select if panel name is clear from user request",
      },
      query: {
        type: "string",
        description: "Query and keywords to select panel if panel name is not clear from user request",
      },
    },
    required: [],
  }),
  run: async (context, args) => {
    // const { panel_name, query } = args;
    // const { dashboard } = context.app;
    return `Successfully selected the panel`;
  },
};

const SYSTEM_MESSAGE = ``;

export const analysisAgent: LlmAgent = {
  type: "agent",
  name: "analysis",
  title: "Analysis",
  description: (_) => "Provides analysis on the data in the dashboard",
  systemMessage: SYSTEM_MESSAGE,
  plugins: [choosePanelTool],
};
