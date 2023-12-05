import { TreeNodeData } from "./tree-node-data";

interface MarkdownOptions {
  includeIds?: boolean;
  includeSelected?: boolean;
  includeType?: boolean;
}

export type FilterCriteria = {
  id?: string;
  name?: string;
  type?: string;
  selected?: boolean;
};

export class AssetTree {
  MAX_NODE_LEVEL = 9;
  nodes: TreeNodeData[] = [];

  constructor(rawNodes: TreeNodeData[]) {
    for (let node of rawNodes) {
      this.filterNode(node, 1);
    }
    this.nodes = rawNodes;
  }

  filterNode = (node: TreeNodeData, depth: number) => {
    if (depth === this.MAX_NODE_LEVEL) {
      node.children = [];
    } else {
      node.children?.forEach((child) => this.filterNode(child, depth + 1));
    }
  };

  toMarkdown = (options: MarkdownOptions): string => {
    let markdown =
      "The assets form a hierarchical tree structure. Therefore the data are presented in a tree format. " +
      "For each assets the data are provided in `id - name - (type) - selected/unselected ` format. " +
      "The following is the list of assets:\n\n";
    for (let node of this.nodes) {
      markdown += this.nodeToMarkdown(node, options);
      markdown += "\n";
    }
    return markdown.trimEnd();
  };

  private nodeToMarkdown = (node: TreeNodeData, options: MarkdownOptions, depth = 0): string => {
    const data: string[] = [];
    if (options.includeIds) {
      data.push(`${node.id}`);
    }
    data.push(`${node.name}`);
    if (options.includeType) {
      data.push(`(${node.type.replace(/_id$/, "")})`);
    }
    if (options.includeSelected && node.selected) {
      data.push(`selected`);
    } else {
      data.push(`unselected`);
    }
    let markdown = `${"  ".repeat(depth)}* ${data.join(" - ")}\n`;
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        markdown += this.nodeToMarkdown(child, options, depth + 1);
      });
    }

    return markdown;
  };

  findNodeById = (id: string): TreeNodeData | undefined => {
    const matchingNodes = this.findMatchingNodes({ id });
    return matchingNodes.length > 0 ? matchingNodes[0] : undefined;
  };

  findMatchingNodes = (filter: FilterCriteria): TreeNodeData[] => {
    let matchingNodes: TreeNodeData[] = [];

    for (let node of this.nodes) {
      matchingNodes = matchingNodes.concat(this.findMatchingNodesRecursive(node, filter));
    }

    return matchingNodes;
  };

  private findMatchingNodesRecursive = (node: TreeNodeData, filter: FilterCriteria): TreeNodeData[] => {
    let matchingNodes: TreeNodeData[] = [];

    let isMatch = true;
    for (const key in filter) {
      // @ts-ignore
      if (filter[key] !== node[key]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      matchingNodes.push(node);
    }

    if (node.children) {
      node.children.forEach((child) => {
        matchingNodes = matchingNodes.concat(this.findMatchingNodesRecursive(child, filter));
      });
    }

    return matchingNodes;
  };
}
