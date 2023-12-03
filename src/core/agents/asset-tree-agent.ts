import { LLMAgent, LlmTool } from "../orchestration/llm-function";

const toggleAssetNodeFunction: LlmTool = {
  type: "tool",
  name: "toggle_asset_node_selection",
  title: "Toggle Asset Node Selection",
  description: (_) => "Toggles (selects or deselects) the asset nodes in the asset tree",
  parameters: (_) => ({
    type: "object",
    properties: {
      node_ids: {
        type: "array",
        description: "Node ids to toggle",
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
      throw new Error("toggleAssetNodes is not defined");
    }

    const nodeIds = node_ids as string[];

    const toggleNodes = [];
    for (const nodeId of nodeIds) {
      const node = assetTree.findNodeById(nodeId);
      if (node) {
        toggleNodes.push(node);
      }
    }
    if (toggleNodes.length > 0) {
      toggleAssetNodes(toggleNodes);
    }

    return `Toggled nodes ${nodeIds.join(", ")}`;
  },
};

const listAssetsFunction: LlmTool = {
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
    });

    return markdown || "";
  },
};

export const assetTreeAgent: LLMAgent = {
  type: "agent",
  name: "asset_tree",
  title: "Asset Tree",
  description: (_) =>
    "Can answer questions about asset tree including listing the assets and selecting or unselecting them. Assets include companies, continents, counties, regions, blocks, stations, fields and reservoirs",
  plugins: [listAssetsFunction, toggleAssetNodeFunction],
};
