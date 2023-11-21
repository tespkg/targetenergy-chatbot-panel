import { getTemplateSrv } from '@grafana/runtime'
import { TimeRange } from '@grafana/data'

export class Dashboard {
  id: number
  title: string
  uid: string
  panelGroups: PanelGroup[]
  timeRange: TimeRange

  constructor(jsonModel: any, timeRange: TimeRange) {
    const { dashboard: dashboardModel } = jsonModel

    this.id = dashboardModel.id
    this.title = dashboardModel.title
    this.uid = dashboardModel.uid
    this.panelGroups = []
    this.timeRange = timeRange

    if (dashboardModel.panels && Array.isArray(dashboardModel.panels)) {
      this.panelGroups = dashboardModel.panels.map((panel: any) => this.createPanelGroup(panel))
    }
  }

  private createPanelGroup = (panelGroupJson: any) => {
    let panels: Panel[] = []
    if (panelGroupJson.panels && Array.isArray(panelGroupJson.panels)) {
      panels = panelGroupJson.panels.map((subPanel: any) => this.createPanel(subPanel))
    }

    return new PanelGroup(panelGroupJson.title, panelGroupJson.type, panels)
  }

  private createPanel = (panelJson: any) => {
    let panels: Panel[] = []
    if (panelJson.panels && Array.isArray(panelJson.panels)) {
      panels = panelJson.panels.map((subPanel: any) => this.createPanel(subPanel))
    }

    return new Panel(panelJson.title, panelJson.type, panelJson.datasource, this.timeRange, panelJson.targets, panels)
  }

  findPanel = (title: string) => {
    for (let panelGroup of this.panelGroups) {
      const panel = panelGroup.findPanel(title)
      if (panel) {
        return panel
      }
    }

    return undefined
  }
}

class PanelGroup {
  title: string
  type: string
  panels: Panel[]

  constructor(title: string, type: string, panels: Panel[]) {
    this.title = title
    this.type = type
    this.panels = panels
  }

  rootElement = () => {
    const panelElements = Array.from(document.querySelectorAll('.dashboard-row'))
    // @ts-ignore
    const panelElement = panelElements.find((element) => element.innerText.includes(this.title))
    return panelElement
  }

  toggle = () => {
    const panelElement = this.rootElement()
    if (!panelElement) {
      throw new Error(`Panel with title ${this.title} not found`)
    }
    const toggleButton = panelElement.querySelector('.dashboard-row__title') as HTMLButtonElement
    toggleButton?.click()
  }

  isCollapsed = () => {
    const panelElement = this.rootElement()
    if (!panelElement) {
      throw new Error(`Panel with title ${this.title} not found`)
    }
    return panelElement.classList.contains('dashboard-row--collapsed')
  }

  findPanel = (title: string): Panel | undefined => {
    for (let panel of this.panels) {
      if (panel.title === title) {
        return panel
      }

      const foundPanel = panel.findPanel(title)
      if (foundPanel) {
        return foundPanel
      }
    }

    return undefined
  }
}

class Panel {
  title: string
  type: string
  datasource?: DataSource
  targets?: PanelTarget[]
  panels: Panel[]
  timeRange: TimeRange

  constructor(
    title: string,
    type: string,
    datasource: DataSource,
    timeRange: TimeRange,
    targets: PanelTarget[],
    panels: Panel[]
  ) {
    this.title = title
    this.type = type
    this.datasource = datasource
    this.timeRange = timeRange
    this.targets = targets
    this.panels = panels
  }

  findPanel = (title: string): Panel | undefined => {
    // look through panels recursively to find the panel with matching title
    for (let panel of this.panels) {
      if (panel.title === title) {
        return panel
      }

      const foundPanel = panel.findPanel(title)
      if (foundPanel) {
        return foundPanel
      }
    }

    return undefined
  }

  fetchData = async () => {
    const url = '/api/ds/query'

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        queries: this.targets?.map((target) => ({
          datasource: this.datasource,
          format: target.format,
          meta: target.meta,
          queryType: target.queryType,
          rawSql: this.getSqlQuery(target.rawSql),
          refId: target.refId,
        })),
        range: this.timeRange,
        from: `${this.timeRange.from.unix() * 1000}`,
        to: `${this.timeRange.to.unix() * 1000}`,
        // range: {
        //   from: '1949-09-13T19:40:17.675Z',
        //   to: '2056-03-27T20:16:09.327Z',
        //   raw: {
        //     from: '1949-09-13T19:40:17.675Z',
        //     to: '2056-03-27T20:16:09.327Z',
        //   },
        // },
        // from: '-640585182325',
        // to: '2721413769327',
        // ...this.timeRange,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const json = await response.json()
    console.log('Fetched data ::: ', json)
  }

  getSqlQuery = (rawSql: string) => {
    const variables = getTemplateSrv().getVariables()

    const templateVariables = variables.map((variable) => ({
      name: variable.name,
      // @ts-ignore
      value: variable.current.value,
    }))

    for (let { name, value } of templateVariables) {
      const pattern = new RegExp(`\\$\{${name}\}`, 'g')
      rawSql = rawSql.replace(pattern, value)
    }

    return rawSql
  }
}

interface DataSource {
  type: string
  uid: string
}

export interface PanelTarget {
  datasource: DataSource
  format: number
  meta: any
  queryType: string
  rawSql: string
  refId: string
  // selectedFormat: number
}
