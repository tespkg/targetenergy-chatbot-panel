import { TreeNodeData } from '../types/TreeNodeData'

interface MarkdownOptions {
  includeIds?: boolean
  includeSelected?: boolean
}

export class AssetNodes {
  MAX_NODE_LEVEL = 9
  nodes: TreeNodeData[] = []

  constructor(rawNodes: TreeNodeData[]) {
    for (let node of rawNodes) {
      this.nodes.push(this.filterNode(node, 1))
    }
  }

  filterNode = (node: TreeNodeData, depth: number): TreeNodeData => {
    console.log('depth', depth)
    if (depth === this.MAX_NODE_LEVEL) {
      return { ...node, children: [] }
    } else {
      return {
        ...node,
        children: node.children?.map((child) => this.filterNode(child, depth + 1)) ?? [],
      }
    }
  }

  toMarkdown = (options: MarkdownOptions): string => {
    let markdown = ''
    for (let node of this.nodes) {
      markdown += this.nodeToMarkdown(node, options)
      markdown += '\n'
    }
    return markdown.trimEnd()
  }

  private nodeToMarkdown = (node: TreeNodeData, options: MarkdownOptions, depth = 0): string => {
    const data: string[] = []
    if (options.includeIds) {
      data.push(`${node.id}`)
    }
    data.push(`${node.name}`)
    if (options.includeSelected && node.selected) {
      data.push(`selected`)
    }

    let markdown = `${'  '.repeat(depth)}- ${data.join(' - ')}\n}`
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        markdown += this.nodeToMarkdown(child, options, depth + 1)
      })
    }

    return markdown
  }

  getAssetNodes = (tree: TreeNodeData[]): TreeNodeData[] => {
    const assetNodes = []
    const nodeTypes = ['']
    for (let node of tree) {
      if (node.type && !nodeTypes.includes(node.type)) {
        assetNodes.push(node)
      }
    }
    return assetNodes
  }
}
