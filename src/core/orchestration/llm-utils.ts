import { Plugin } from "./llm-function";

export const prettifyPlugin = (plugin: Plugin, indent = "", isLast = true): string => {
  let isRoot = indent.length === 0;
  let prefix = isRoot ? "" : isLast ? "└─ " : "├─ ";
  let result = indent + prefix + `${plugin.title} (${plugin.type})\n`;

  if (plugin.type === "agent" && plugin.plugins) {
    const childIndent = indent + (isLast ? "   " : "│  ");
    plugin.plugins.forEach((child: any, index: number) => {
      result += prettifyPlugin(child, childIndent, index === plugin.plugins.length - 1);
    });
  }

  return result;
};
