import { ChatFunction, ChatFunctionSet, runChatAgent } from './chatbot-agent'
import { subAgentParameters } from './common'
import { BotMessage } from './bot-types'
import { formatTemplatedString } from '../commons/utils/string-utils'

const SYSTEM_MESSAGE_TEMPLATE = `You are helpful chatbot designed to help users interact Dashboard Panels in the Portfolio Manager application.

## INSTRUCTIONS

Your task is to generate function calls to achieve user's objectives.
If the value for a required function parameter is missing ask the user to provide the value.

# DASHBOARD STRUCTURE

The dashboard is consisted of panels and sub panels. Panels are a group of sub panels and the actual tables, visualizations and charts reside in sub panels.

The list of panels and sub panels are:

\${panels}
`

export const panelManagerAgent: ChatFunction = {
  name: 'panel_manager',
  title: 'Panel Manager',
  description: (ctx) =>
    'Can answer questions about dashboard panels. Can list the panels and interact with them. Panels can have sub panels.',
  isAgent: true,
  parameters: (context) => subAgentParameters,
  run: async (context, args, abortSignal, callbacks) => {
    const { question } = args
    const { dashboard } = context

    const messages: BotMessage[] = [
      {
        role: 'user',
        content: question as string,
      },
    ]

    const systemMessage = formatTemplatedString(SYSTEM_MESSAGE_TEMPLATE, {
      panels: dashboard?.toMarkdown() || '',
    })

    return await runChatAgent(
      'Panel Manager',
      messages,
      new ChatFunctionSet(
        [listPanelsFunction, listSubPanelsFunction, togglePanelFunction, fetchPanelData],
        abortSignal,
        callbacks
      ),
      {
        abortSignal,
        callbacks,
        context,
        systemMessage,
      }
    )
  },
}

const listPanelsFunction: ChatFunction = {
  name: 'list_panels',
  title: 'List Panels',
  description: (ctx) =>
    'Lists the panels in the dashboard. It includes the panel and whether the panel is expanded or not.',
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const { dashboard } = context

    if (!dashboard) {
      throw new Error('Dashboard is not defined')
    }

    const panelInfos = dashboard.panels.map((p) => ({
      title: p.title,
      collapsed: p.isCollapsed(),
    }))

    return JSON.stringify(panelInfos, null, 2)
  },
}

const listSubPanelsFunction: ChatFunction = {
  name: 'list_sub_panels',
  title: 'List Sub Panels',
  description: (ctx) =>
    'Lists the panels in the dashboard. It includes the panel and whether the panel is expanded or not.',
  isAgent: false,
  parameters: (ctx) => ({
    type: 'object',
    properties: {
      panel_name: {
        type: 'string',
        description: 'Panel name to list sub panels',
      },
    },
    required: ['panel_name'],
  }),
  run: async (context, args, abortSignal, callbacks) => {
    const { panel_name } = args
    const { dashboard } = context

    if (!dashboard) {
      throw new Error('Dashboard is not defined')
    }

    const panelGroup = dashboard.panels.find((pg) => pg.title.includes(panel_name))
    if (!panelGroup) {
      throw new Error(`Panel group with name ${panel_name} not found`)
    }

    const subPanelNames = panelGroup.panels.map((p) => ({
      title: p.title,
    }))

    return `Sub Panels for ${panel_name}:\n${JSON.stringify(subPanelNames, null, 2)}`
  },
}

const togglePanelFunction: ChatFunction = {
  name: 'toggle_panel',
  title: 'Toggle Panel',
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
    const { dashboard } = context

    if (!dashboard) {
      throw new Error('Dashboard is not defined')
    }

    const panels = dashboard.panels
    const panel = panels.find((p) => p.title.includes(panel_name))
    if (!panel) {
      throw new Error(`Panel with name ${panel_name} not found`)
    }

    panel.toggle()

    return panel.isCollapsed() ? `Collapsed panel ${panel_name}.` : `Expanded panel ${panel_name}.`
  },
}

const fetchPanelData: ChatFunction = {
  name: 'fetch_panel_data',
  title: 'Fetch Panel Data',
  description: (ctx) =>
    'Fetches the data for the sub panel. The data will be in csv format. The data can be used for visualization or analysis. Whenever the user asks for data analysis, call this function before performing the analysis.',
  parameters: (ctx) => ({
    type: 'object',
    properties: {
      panel_name: {
        type: 'string',
        description: 'Panel name to fetch data for',
      },
    },
    required: ['panel_name'],
  }),
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const { panel_name } = args
    const { dashboard } = context

    if (!dashboard) {
      throw new Error('Dashboard is not defined')
    }

    const subPanel = dashboard.findPanel(panel_name)
    if (!subPanel) {
      throw new Error(`Panel with name ${panel_name} not found`)
    }

    const data = await subPanel.csvData()

    return data.join('\n\n')
  },
}
