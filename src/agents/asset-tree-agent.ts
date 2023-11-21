import { ChatFunction, ChatFunctionSet, runChatAgent } from '../api/chatbot-agent'
import { subAgentParameters } from './common'
import { BotMessage } from '../api/bot-types'

export const assetTreeAgent: ChatFunction = {
  name: 'asset_tree',
  description: (ctx) =>
    'Can answer questions about asset tree including listing the assets and selecting or unselecting them. Assets include companies, continents, counties, regions, blocks, stations, fields and reservoirs',
  isAgent: true,
  run: async (context, args, abortSignal, callbacks) => {
    const { question } = args

    const messages: BotMessage[] = [
      {
        role: 'user',
        content: question as string,
      },
    ]

    return await runChatAgent(
      messages,
      new ChatFunctionSet([listAssetsFunction, toggleAssetNodeFunction], abortSignal, callbacks),
      {
        abortSignal,
        callbacks,
        context,
        systemMessage: context.agentOptions?.systemMessage,
      }
    )
  },
  parameters: (ctx) => subAgentParameters,
}

const toggleAssetNodeFunction: ChatFunction = {
  name: 'toggle_asset_node_selection',
  description: (ctx) => 'Toggles (selects or deselects) the asset nodes in the asset tree',
  parameters: (ctx) => ({
    type: 'object',
    properties: {
      node_ids: {
        type: 'array',
        description: 'Node ids to toggle',
        items: {
          type: 'string',
        },
      },
    },
    required: ['node_ids'],
  }),
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const { node_ids } = args
    const { assetTree, toggleAssetNodes } = context

    if (!assetTree) {
      throw new Error('Asset tree is not defined')
    }
    if (!toggleAssetNodes) {
      throw new Error('toggleAssetNodes is not defined')
    }

    const nodeIds = node_ids as string[]

    const toggleNodes = []
    for (const nodeId of nodeIds) {
      const node = assetTree.findNodeById(nodeId)
      if (node) {
        toggleNodes.push(node)
      }
    }
    if (toggleNodes.length > 0) {
      toggleAssetNodes(toggleNodes)
    }

    return `Toggled nodes ${nodeIds.join(', ')}`
  },
}

const listAssetsFunction: ChatFunction = {
  name: 'list_assets',
  description: (ctx) =>
    'Lists the assets in the asset tree in a markdown format. The ids and selected status can be included in the output',
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const { assetTree } = context

    const markdown = assetTree?.toMarkdown({
      includeIds: true,
      includeSelected: true,
    })

    return markdown || ''
  },
}
