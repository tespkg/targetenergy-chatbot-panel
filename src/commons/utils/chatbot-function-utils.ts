import { BotFunctionDefinition } from '../types/bot-types'
import { CHATBOT_FUNCTIONS } from '../enums/Chatbot'

interface Params {}

export function createChatBotFunctionDefinitions({}: Params): BotFunctionDefinition[] {
  return [
    {
      name: CHATBOT_FUNCTIONS.GET_USER_NAME,
      description: 'Get user name',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: CHATBOT_FUNCTIONS.TOGGLE_ASSET_NODES,
      description: 'Toggles the asset nodes in the asset tree',
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
