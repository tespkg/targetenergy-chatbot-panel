import { ChatFunction, ChatFunctionSet, runChatAgent } from '../api/chatbot-agent'
import { subAgentParameters } from './common'
import { BotMessage } from '../api/bot-types'

export const panelManagerAgent: ChatFunction = {
  name: 'panel_manager',
  description: (ctx) => 'Can answer questions about dashboard panels. Can list the panels and interact with them.',
  isAgent: true,
  parameters: (context) => subAgentParameters,
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
      new ChatFunctionSet([listPanelsFunction, togglePanelFunction], abortSignal, callbacks),
      {
        abortSignal,
        callbacks,
        context,
        systemMessage: context.agentOptions?.systemMessage,
      }
    )
  },
}

const listPanelsFunction: ChatFunction = {
  name: 'list_panels',
  description: (ctx) =>
    'Lists the panels in the dashboard. It includes the panel and whether the panel is expanded or not.',
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const panels = getPanels()

    const panelInfos = panels.map((panel) => ({
      name: panel.name,
      collapsed: panel.collapsed,
    }))

    return JSON.stringify(panelInfos, null, 2)
  },
}

const togglePanelFunction: ChatFunction = {
  name: 'toggle_panel',
  description: (ctx) => 'Toggles (expands or collapses) the panel',
  parameters: (ctx) => ({
    type: 'object',
    properties: {
      panel_name: {
        type: 'string',
        description: 'Panel name to toggle',
      },
    },
    required: ['panel_name'],
  }),
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const { panel_name } = args

    const panels = getPanels()
    const panel = panels.find((p) => p.name.includes(panel_name))
    if (!panel) {
      throw new Error(`Panel with name ${panel_name} not found`)
    }

    panel.toggle()
    return `Toggled panel ${panel_name}`
  },
}

function getPanels() {
  const panelElements = Array.from(document.querySelectorAll('.dashboard-row'))
  const panels = panelElements.map((element) => {
    const toggleButton = element.querySelector('.dashboard-row__title') as HTMLButtonElement
    const name = toggleButton.childNodes[1].textContent!.trim()
    console.log('Panel Name: ', name)
    const collapsed = element.classList.contains('dashboard-row--collapsed')
    return { element, name, collapsed, toggle: () => toggleButton?.click() }
  })
  return panels
}
