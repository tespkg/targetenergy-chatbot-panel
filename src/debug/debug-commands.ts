import { DebugCommand } from "./debug-command";
import { getTemplateSrv } from "@grafana/runtime";
import { mainAgent } from "../core/agents/main-agent";
import { prettifyPlugin } from "../core/orchestration/llm-utils";

export const findPanel: DebugCommand = {
  name: "find_panel",
  execute: async (args: any) => {
    const { dashboard, name } = args;

    if (!name) {
      console.log("Please provide a name to search for");
      return;
    }

    console.log("Parsed dashboard:", dashboard);
    const panel = dashboard.findPanel(name);
    console.log("Parsed panel:", panel);
    const data = await panel?.csvData();
    const formattedData = data.join("\n\n");
    console.log("Parsed data:", formattedData);
  },
};

export const printGlobalVars: DebugCommand = {
  name: "print_global_vars",
  execute: async (args: any) => {
    const variables = getTemplateSrv().getVariables();
    console.log(variables);
  },
};

export const printDashboard: DebugCommand = {
  name: "print_dashboard",
  execute: async (args: any) => {
    const { dashboard } = args;
    console.log("Dashboard Markdown\n", dashboard.toMarkdown(2));
  },
};

export const printAgents: DebugCommand = {
  name: "print_agents",
  execute: async (args: any) => {
    console.log("print_agents");
    const result = prettifyPlugin(mainAgent);
    console.log(result);
  },
};

export const toggleRow: DebugCommand = {
  name: "toggle_row",
  execute: async (args: any) => {
    const { name } = args;

    if (!name) {
      console.log("Please provide a name to search for");
      return;
    }

    // Select rows by a unique attribute or structure, here we use the row's title text
    const rows = Array.from(document.querySelectorAll(".dashboard-row"));
    console.log("Queries rows :::", rows);

    // @ts-ignore
    const targetRow = rows.find((row) => row.innerText.includes(name));
    if (targetRow) {
      // targetRow.click()
      // Find the toggle button or element in the row and click it
      const toggleButton = targetRow.querySelector(".dashboard-row__title") as HTMLButtonElement; // Adjust this selector based on the actual structure
      toggleButton.click();
    }
  },
};

export const debugCommands = [findPanel, printGlobalVars, printDashboard, printAgents, toggleRow];
