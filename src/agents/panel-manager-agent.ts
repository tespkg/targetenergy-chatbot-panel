import { ChatFunction, ChatFunctionSet, runChatAgent } from '../api/chatbot-agent'
import { subAgentParameters } from './common'
import { BotMessage } from '../api/bot-types'

export const panelManagerAgent: ChatFunction = {
  name: 'panel_manager',
  description: (ctx) =>
    'Can answer questions about dashboard panels. Can list the panels and interact with them. Panels can have sub panels.',
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
      new ChatFunctionSet(
        [listPanelsFunction, listSubPanelsFunction, togglePanelFunction, fetchSubPanelData],
        abortSignal,
        callbacks
      ),
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
    const { dashboard } = context

    if (!dashboard) {
      throw new Error('Dashboard is not defined')
    }

    const panelInfos = dashboard.panelGroups.map((p) => ({
      title: p.title,
      collapsed: p.isCollapsed(),
    }))

    return JSON.stringify(panelInfos, null, 2)
  },
}

const listSubPanelsFunction: ChatFunction = {
  name: 'list_sub_panels',
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

    const panelGroup = dashboard.panelGroups.find((pg) => pg.title.includes(panel_name))
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

    const panels = dashboard.panelGroups
    const panel = panels.find((p) => p.title.includes(panel_name))
    if (!panel) {
      throw new Error(`Panel with name ${panel_name} not found`)
    }

    panel.toggle()

    return panel.isCollapsed() ? `Collapsed panel ${panel_name}.` : `Expanded panel ${panel_name}.`
  },
}

const fetchSubPanelData: ChatFunction = {
  name: 'fetch_sub_panel_data',
  description: (ctx) =>
    'Fetches the data for the sub panel. The data can be used for visualization or analysis. The data will be in csv format.',
  parameters: (ctx) => ({
    type: 'object',
    properties: {
      sub_panel_name: {
        type: 'string',
        description: 'Sub panel name to fetch data for',
      },
    },
    required: ['panel_name'],
  }),
  isAgent: false,
  run: async (context, args, abortSignal, callbacks) => {
    const { sub_panel_name } = args
    const { dashboard } = context

    if (!dashboard) {
      throw new Error('Dashboard is not defined')
    }

    const subPanel = dashboard.findPanel(sub_panel_name)
    if (!subPanel) {
      throw new Error(`Panel with name ${sub_panel_name} not found`)
    }

    const data = await subPanel.fetchData()

    return jsonToCSV(data)
  },
}

export function jsonToCSV(jsonResponse: any) {
  // Extracting schema fields for CSV headers
  const fields = jsonResponse.results.A.frames[0].schema.fields
  const headers = fields.map((field: any) => field.name)

  // Extracting data values
  const data = jsonResponse.results.A.frames[0].data.values

  // Transposing the data to get rows instead of columns
  const rows = data[0].map((_, colIndex) => data.map((row) => row[colIndex]))

  // Creating CSV string
  let csvContent = headers.join(',') + '\n' // Add headers
  rows.forEach((row) => {
    csvContent += row.join(',') + '\n' // Add each row
  })

  return csvContent
}
