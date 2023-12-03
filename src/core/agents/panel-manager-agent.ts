import { LLMAgent, LlmTool } from "../orchestration/llm-function";

const listPanelsFunction: LlmTool = {
  type: "tool",
  name: "list_panels",
  title: "List Panels",
  description: (_) =>
    "Lists the panels in the dashboard. It includes the panel and whether the panel is expanded or not.",
  run: async (context, _) => {
    const { dashboard } = context.app;

    if (!dashboard) {
      throw new Error("Dashboard is not defined");
    }

    const panelInfos = dashboard.panels.map((p) => ({
      title: p.title,
      collapsed: p.isCollapsed(),
    }));

    return JSON.stringify(panelInfos, null, 2);
  },
};

const listSubPanelsFunction: LlmTool = {
  type: "tool",
  name: "list_sub_panels",
  title: "List Sub Panels",
  description: (_) =>
    "Lists the panels in the dashboard. It includes the panel and whether the panel is expanded or not.",
  parameters: (_) => ({
    type: "object",
    properties: {
      panel_name: {
        type: "string",
        description: "Panel name to list sub panels",
      },
    },
    required: ["panel_name"],
  }),
  run: async (context, args) => {
    const { panel_name } = args;
    const { dashboard } = context.app;

    if (!dashboard) {
      throw new Error("Dashboard is not defined");
    }

    const panelGroup = dashboard.panels.find((pg) => pg.title.includes(panel_name));
    if (!panelGroup) {
      throw new Error(`Panel group with name ${panel_name} not found`);
    }

    const subPanelNames = panelGroup.panels.map((p) => ({
      title: p.title,
    }));

    return `Sub Panels for ${panel_name}:\n${JSON.stringify(subPanelNames, null, 2)}`;
  },
};

const togglePanelFunction: LlmTool = {
  type: "tool",
  name: "toggle_panel",
  title: "Toggle Panel",
  description: (_) => "Toggles (expands or collapses) the panel",
  parameters: (_) => ({
    type: "object",
    properties: {
      panel_name: {
        type: "string",
        description: "Panel name to toggle",
      },
    },
    required: ["panel_name"],
  }),
  run: async (context, args) => {
    const { panel_name } = args;
    const { dashboard } = context.app;

    if (!dashboard) {
      throw new Error("Dashboard is not defined");
    }

    const panels = dashboard.panels;
    const panel = panels.find((p) => p.title.includes(panel_name));
    if (!panel) {
      throw new Error(`Panel with name ${panel_name} not found`);
    }

    panel.toggle();

    return panel.isCollapsed() ? `Collapsed panel ${panel_name}.` : `Expanded panel ${panel_name}.`;
  },
};

const fetchPanelData: LlmTool = {
  type: "tool",
  name: "fetch_panel_data",
  title: "Fetch Panel Data",
  description: (_) =>
    "Fetches the data for the sub panel. The data will be in csv format. The data can be used for visualization or analysis. Whenever the user asks for data analysis, call this function before performing the analysis.",
  parameters: (_) => ({
    type: "object",
    properties: {
      panel_name: {
        type: "string",
        description: "Panel name to fetch data for",
      },
    },
    required: ["panel_name"],
  }),
  run: async (context, args) => {
    const { panel_name } = args;
    const { dashboard } = context.app;

    if (!dashboard) {
      throw new Error("Dashboard is not defined");
    }

    const subPanel = dashboard.findPanel(panel_name);
    if (!subPanel) {
      throw new Error(`Panel with name ${panel_name} not found`);
    }

    const data = await subPanel.csvData();

    const analysisTips: Record<string, string> = {
      "1P Proven - Oil":
        "List the reservoir reserve and then indicate which reservoir contributes the most and the least to reserves.",
      "1P Proven - Associated Gas":
        "List the reservoir reserve and then indicate which reservoir contributes the most and the least to reserves.",
      "Change in Proven Oil Reserves":
        "The provided data are changes in proven reverse vs action on reservoir. You should report the most and least effective actions.",
      "1P Proven - Oil - Production Profile":
        "The provided data are the list of oil production for different reservoirs. You should compare the average production of reservoirs.",
    };

    const response = data.join("\n\n");

    const tip = analysisTips[panel_name] || "";
    if (tip) {
      return `${response}\n\nTo analyze these data you should: ${tip}`;
    }

    return response;
  },
};

const SYSTEM_MESSAGE_TEMPLATE = `You are helpful chatbot designed to help users interact Dashboard Panels in the Portfolio Manager application.

## INSTRUCTIONS

Your task is to generate function calls to achieve user's objectives.
If the value for a required function parameter is missing ask the user to provide the value.

# DASHBOARD STRUCTURE

The dashboard is consisted of panels and sub panels. Panels are a group of sub panels and the actual tables, visualizations and charts reside in sub panels.

The list of panels and sub panels are:

\${panels}
`;

export const panelManagerAgent: LLMAgent = {
  type: "agent",
  name: "panel_manager",
  title: "Panel Manager",
  description: (_) =>
    "Can answer questions about dashboard panels. Can list the panels and interact with them. Panels can have sub panels.",
  systemMessage: SYSTEM_MESSAGE_TEMPLATE,
  plugins: [listPanelsFunction, listSubPanelsFunction, togglePanelFunction, fetchPanelData],
};
