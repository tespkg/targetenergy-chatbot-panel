import { BotFunctionDefinition } from '../../api/bot-types'
import { CHATBOT_FUNCTIONS } from '../enums/Chatbot'

interface Params {}

export function createChatBotFunctionDefinitions({}: Params): BotFunctionDefinition[] {
  return [
    {
      name: CHATBOT_FUNCTIONS.TOGGLE_ASSET_NODE_SELECTION,
      description: 'Toggles (selects or deselects) the asset nodes in the asset tree',
      parameters: {
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
      },
    },
  ]
}
