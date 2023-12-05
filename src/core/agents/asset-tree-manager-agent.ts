import { LlmAgent, Tool } from "../orchestration/llm-function";

const selectAssetTool: Tool = {
  type: "tool",
  name: "select_asset",
  title: "Select Asset",
  description: (_) => "Selects the asset node in the asset tree",
  parameters: (_) => ({
    type: "object",
    properties: {
      node_ids: {
        type: "array",
        description: "Node ids to select",
        items: {
          type: "string",
        },
      },
    },
    required: ["node_ids"],
  }),
  run: async (context, args) => {
    const { node_ids } = args;
    const { assetTree, toggleAssetNodes } = context.app;

    if (!assetTree) {
      throw new Error("Asset tree is not defined");
    }
    if (!toggleAssetNodes) {
      throw new Error("selectAssetNodes is not defined");
    }

    const nodesToSelect = [];
    for (let nodeId of node_ids) {
      const node = assetTree.findNodeById(nodeId);
      if (node && !node.selected) {
        nodesToSelect.push(node);
      }
    }

    toggleAssetNodes(nodesToSelect);
    return `Successfully selected the nodes`;
  },
};

const unselectAssetTool: Tool = {
  type: "tool",
  name: "unselect_asset",
  title: "Unselect Asset",
  description: (_) => "Unselects the asset node in the asset tree",
  parameters: (_) => ({
    type: "object",
    properties: {
      node_ids: {
        type: "array",
        description: "Node ids to unselect",
        items: {
          type: "string",
        },
      },
    },
    required: ["node_ids"],
  }),
  run: async (context, args) => {
    const { node_ids } = args;
    const { assetTree, toggleAssetNodes } = context.app;

    if (!assetTree) {
      throw new Error("Asset tree is not defined");
    }
    if (!toggleAssetNodes) {
      throw new Error("selectAssetNodes is not defined");
    }

    const nodesToUnselect = [];
    for (let nodeId of node_ids) {
      const node = assetTree.findNodeById(nodeId);
      if (node && node.selected) {
        nodesToUnselect.push(node);
      }
    }

    toggleAssetNodes(nodesToUnselect);
    return `Successfully unselected the nodes`;
  },
};

const listAssetsTool: Tool = {
  type: "tool",
  name: "list_assets",
  title: "List Assets",
  description: (_) =>
    "Lists the assets in the asset tree in a markdown format. The ids and selected status can be included in the output",
  run: async (context, _) => {
    const { assetTree } = context.app;

    const markdown = assetTree?.toMarkdown({
      includeIds: true,
      includeSelected: true,
      includeType: true,
    });

    return markdown || "";
  },
};

const SYSTEM_MESSAGE = `
You are a helpful chatbot. 

You can answer questions about the asset tree including listing the assets and selecting or unselecting them. Assets include companies, continents, counties, regions, blocks, stations, fields and reservoirs
`;

export const assetTreeManagerAgent: LlmAgent = {
  type: "agent",
  name: "asset_tree_manager",
  title: "Asset Tree Manager",
  description: (_) =>
    "Can answer questions about asset tree including listing the assets and selecting or unselecting them. Assets include companies, continents, counties, regions, blocks, stations, fields and reservoirs",
  plugins: [listAssetsTool, selectAssetTool, unselectAssetTool],
  systemMessage: SYSTEM_MESSAGE,
};
