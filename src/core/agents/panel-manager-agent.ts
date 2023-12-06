import { LlmAgent, Tool } from "../orchestration/llm-function";

const listPanelsFunction: Tool = {
  type: "tool",
  name: "list_panels",
  title: "List Panels",
  description: (_) =>
    "Lists the panels in the dashboard. It includes the panel rows and panels and whether the panel row is expanded or not.",
  run: async (context, _) => {
    const { dashboard } = context.app;

    if (!dashboard) {
      throw new Error("Dashboard is not defined");
    }

    return dashboard.toMarkdown(2, {
      includeDescription: false,
      includeGroups: true,
      includeType: true,
    });
  },
};

const togglePanelRowFunction: Tool = {
  type: "tool",
  name: "toggle_panel_row",
  title: "Toggle Panel Row",
  description: (_) => "Toggles (expands or collapses) the panel row",
  parameters: (_) => ({
    type: "object",
    properties: {
      panel_row_name: {
        type: "string",
        description: "Panel name to toggle",
      },
    },
    required: ["panel_row_name"],
  }),
  run: async (context, args) => {
    const { panel_row_name } = args;
    const { dashboard } = context.app;

    if (!dashboard) {
      throw new Error("Dashboard is not defined");
    }

    const panelsGroups = dashboard.panelGroups;
    const panel = panelsGroups.find((p) => p.title.includes(panel_row_name));
    if (!panel) {
      throw new Error(`Panel with name ${panel_row_name} not found`);
    }

    panel.toggle();

    return panel.isCollapsed() ? `Collapsed panel ${panel_row_name}.` : `Expanded panel ${panel_row_name}.`;
  },
};

// const findPanelTool: LlmTool = {
//   type: "llm-tool",
//   name: "find_panel",
//   title: "Find Panel",
//   description: (_) => "Finds the panel in the application based on a query",
//   parameters: (_) => ({
//     type: "object",
//     properties: {
//       query: {
//         type: "string",
//         description: "Query to find the panel",
//       },
//     },
//     required: ["query"],
//   }),
//   getMessages: async (context, args) => {
//     const { query } = args;
//     const { dashboard } = context.app;
//
//     console.log("Inside the find panel tool");
//
//     if (!dashboard) {
//       throw new Error("Dashboard is not defined");
//     }
//
//     dashboard.toMarkdown();
//
//     return [
//       {
//         role: "system",
//         content:
//           "You are a helpful chatbot. Your goal is to find a the related panel to user query." +
//           `\n\nThe panels are: ${dashboard.toMarkdown(2)}`,
//       },
//       {
//         role: "user",
//         content: `Query: ${query}`,
//       },
//     ];
//   },
// };

const fetchPanelData: Tool = {
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

const SYSTEM_MESSAGE_TEMPLATE = `
You are helpful chatbot designed to help users interact Dashboard Panels in the Portfolio Manager application. 
The dashboard has been written in Grafana so it consists of panel rows and panels. 
Panel rows are a groups of panel and the actual tables, visualizations and charts reside in panels.`;

export const panelManagerAgent: LlmAgent = {
  type: "agent",
  name: "panel_manager",
  title: "Panel Manager",
  description: (_) => "Can answer questions about dashboard panels. Can list the panels and interact with them.",
  systemMessage: SYSTEM_MESSAGE_TEMPLATE,
  plugins: [
    listPanelsFunction,
    togglePanelRowFunction,
    //findPanelTool,
    fetchPanelData,
  ],
};
