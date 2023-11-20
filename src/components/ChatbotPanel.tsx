import {css, cx} from '@emotion/css'
import {locationService} from '@grafana/runtime'
import {PanelProps} from '@grafana/data'
import {Alert, useStyles2} from '@grafana/ui'
import * as React from 'react'
import {useEffect} from 'react'
import {TreeOptions} from 'types'
import {ChatMessagePanel} from 'components/chat-bot/ChatMessagePanel'
import * as Handlebars from 'handlebars'
import './style.css'
import {setGrafanaVariable} from "../commons/utils/grafana-variable-utils";

// let renderCount = 0

interface Props extends PanelProps<TreeOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Roboto, Helvetica, Arial, sans-serif;
      position: relative;
    `,
  }
}
export const defaultFormatTemplate = `{{~#each .}}{{#if @index}} OR {{/if}}
{{~@key}} in ({{#each .}}{{~#if @index}},{{/if}}{{~id}}{{~/each}})
{{~/each}}`

const getSearchParam = (variableName: string) => locationService.getSearch().get(`var-${variableName}`) ?? ''

export const ChatbotPanel: React.FC<Props> = ({ options, data, width, height, replaceVariables }) => {
  const styles = useStyles2(getStyles)

  const { field, variableName, firstFourLevelsSortingVariableName, treeFiltersVariableName, defaultExpansionLevel } =
      options

  const rows = data.series
      .map((d) => d.fields.find((f) => f.name === field))
      .map((f) => f?.values)
      .at(-1)
      ?.toArray()

  let formatTemplate = defaultFormatTemplate
  if (options.formatQuery) {
    formatTemplate = options.formatQuery
  }

  const mounted = React.useRef(false)

  // So we can't use getSearchParam(variableName) in initial state as the url state is not yet set
  const [queryVar, setQueryVar] = React.useState(() => {
    const searchParamVar = getSearchParam(variableName).trim()
    if (searchParamVar === '') {
      return replaceVariables(`$${variableName}`).trim()
    }
    return searchParamVar
  })

  useEffect(() => {
    const history = locationService.getHistory()
    return history.listen(() => {
      setQueryVar(getSearchParam(variableName))
    })
  }, [replaceVariables, variableName])

  useEffect(() => {
    mounted.current = true
  }, [])

  const selected = parseSelected(queryVar === options.defaultValue ? '' : queryVar)

  let tree: TreeNodeData[] = []
  let dataError: React.ReactNode | undefined
  try {
    tree = transformData(
        rows ?? [],
        defaultExpansionLevel,
        selected,
        false,
        '',
        {},
        mounted.current
    )
  } catch (e) {
    dataError = (
        <Alert title={`Invalid data format in "${options.field}" column`}>
          Accepted data format are comma separated strings. Possible format of the strings:
          <ul>
            <li>id,id,id,...</li>
            <li>id:name,id:name,id:name,...</li>
            <li>id:name:type,id:name:type,id:name:type,...</li>
          </ul>
        </Alert>
    )
  }

  const [formatTpl, formatTplError] = React.useMemo(() => {
    let error: React.ReactNode
    let fmt = formatTemplate
    try {
      Handlebars.parse(formatTemplate)
    } catch (e: any) {
      if (e.message) {
        error = (
            <Alert title="Incorrect format query">
              <pre>{e.message}</pre>
            </Alert>
        )
      }
      fmt = defaultFormatTemplate
    }
    return [Handlebars.compile(fmt), error]
  }, [formatTemplate])

  const handleSelectNode = (node: TreeNodeData) => {
    // exclusive selection: all parent & children needs to be deselected
    const thisNode = node
    thisNode.selected = !node.selected
    if (thisNode.selected) {
      // unselect all parent
      while (node?.parent) {
        node = node.parent
        if (node?.selected) {
          node.selected = false
        }
      }
      // unselect all children
      const walk = (node: TreeNodeData) => {
        node.selected = false
        node.children?.forEach(walk)
      }
      thisNode.children?.forEach(walk)
    }

    // walk all selected nodes and update query
    const selected: TreeNodeData[] = []
    const walk = (node: TreeNodeData) => {
      if (node.selected) {
        selected.push(node)
      }
      node.children?.forEach(walk)
    }
    walk({ id: '', name: '', type: '', children: tree })

    const entities: { [type: string]: object[] } = {}

    selected.forEach((node) => {
      const type = node.type ?? ''
      if (!entities[type]) {
        entities[type] = []
      }
      entities[type].push({ id: node.id, name: node.name, type: node.type })
    })
    let query = formatTpl(entities)
    if (query === '') {
      query = options.defaultValue
    }
    if (queryVar !== query) {
      if (options.debug) {
        console.log(`setting variable ${variableName}`, query)
      }
      setGrafanaVariable(variableName, query)
    }
  }

  console.log('data', data)
  console.log('tree', tree)

  console.table(data)
  console.table(tree)

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
          padding: 4px;
        `
      )}
    >
      <ChatMessagePanel />
    </div>
  )
}

// match "type in (id1,id2,id3)" where "type" is group 1 and "id1,id2,id3" is group 2
const queryRE = new RegExp(/(\w+)\s+in\s+\(([\w|,]+)\)/)

// TODO(jackieli): only works with default template...
function parseSelected(query: string): { [type: string]: string[] } {
  if (!query.trim()) {
    return {}
  }
  const items = query.split(' OR ')
  return items.reduce((acc, item) => {
    const match = item.match(queryRE)
    if (!match) {
      console.error(`Incorrect query format: ${item}`)
      return acc
    }
    const entity = match[1]
    const ids = match[2].split(',')
    acc[entity] = ids
    return acc
  }, {} as { [type: string]: string[] })
}

export enum MatchSearch {
  match,
  notMatch,
  childMatch,
}


export type TreeNodeData = {
  id: string
  name: string
  type: string
  parent?: TreeNodeData
  children?: TreeNodeData[]
  // ui state
  showChildren?: boolean
  selected?: boolean
  matchSearch?: MatchSearch
}

type NodeSelection = { [key: string]: string[] }

function transformData(
    rows: string[],
    defaultExpansionLevel: number,
    selected: NodeSelection,
    showSelected: boolean,
    debouncedSearchText: string,
    showNodes: NodeSelection,
    firstRenderCompleted: boolean
): TreeNodeData[] {
  // splits each row into items
  const table = rows.map((row) =>
      row.split(',').map((column) => {
        const parts = column.split(':')
        // default we suppose id,id,id,... format
        const item: TreeNodeData = {
          id: parts[0],
          name: parts[0],
          type: parts[0],
        }
        // let's check if we have id:name,id:name,id:name,... format
        if (parts.length > 1) {
          item.name = parts[1]
        }
        // let's check if we have id:name:type,id:name:type,id:name:type,... format
        if (parts.length > 2) {
          item.type = parts[2]
        }
        return item
      })
  )
  const rootItems: TreeNodeData[] = []
  let items: TreeNodeData[] = rootItems
  const selectedNodes: TreeNodeData[] = []
  const w = debouncedSearchText.replace(/[.+^${}()|[\]\\]/g, '\\$&') // regexp escape
  const re = new RegExp(w.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i')

  for (let i = 0; i < table.length; i++) {
    const row = table[i]
    for (let j = 0; j < row.length; j++) {
      const item = row[j]
      if (j === 0) {
        items = rootItems
      } else {
        // find parent level
        const parent = items.find((i) => i.id === row[j - 1].id) ?? throwExpression('parent not found')
        if (!parent.children) {
          parent.children = []
        }
        items = parent.children
        item.parent = parent
      }
      // if we already have an element with the same id, we skip it, avoiding duplicated items
      if (items.findIndex((it) => it.id === item.id) >= 0) {
        continue
      }

      items.push(item)

      if (selected[item.type!!] && selected[item.type!!].includes(item.id)) {
        item.selected = true
        selectedNodes.push(item)
      }

      if (showNodes[item.type!!] && showNodes[item.type!!].includes(item.id)) {
        item.showChildren = true
      }

      if (!debouncedSearchText) {
        item.matchSearch = undefined
      } else if (re.test(item.name)) {
        item.matchSearch = MatchSearch.match
        let v = item
        while (v.parent) {
          v = v.parent
          v.matchSearch = MatchSearch.childMatch
        }
      } else {
        item.matchSearch = MatchSearch.notMatch
      }
    }
  }

  let walk: (node: TreeNodeData) => void

  if (!firstRenderCompleted) {
    // Make sure selected nodes are visible.
    // Here we're making a comprimise: We want to show the user the nodes
    // that'are selected to be visible, but if we use "compute everything when
    // state changes", there is no easy way to collapse all or just collapse
    // any node that has decendent selected
    let walk = (node: TreeNodeData, lvl: number) => {
      if (lvl < defaultExpansionLevel) {
        // console.log(lvl, defaultExpansionLevel, node.name)
        node.showChildren = true
      }

      if (selectedNodes.map((n) => n.id).includes(node.id)) {
        let v = node
        while (v.parent) {
          v.parent.showChildren = true
          v = v.parent
        }
      }
      node.children?.forEach((v) => walk(v, lvl + 1))
    }
    walk({ id: '', name: '', type: '', children: rootItems }, 0)
  }

  // if show selected, hide other items
  if (showSelected) {
    walk = (node: TreeNodeData) => {
      node.children = node.children?.filter((n) => n.selected || n.showChildren)
      node.children?.forEach(walk)
    }
    walk({ id: '', name: '', type: '', children: rootItems })
  }

  return rootItems
}

function throwExpression(errorMessage: string): never {
  throw new Error(errorMessage)
}
