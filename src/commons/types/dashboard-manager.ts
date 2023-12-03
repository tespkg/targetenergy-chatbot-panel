import { getTemplateSrv } from "@grafana/runtime";
import { TimeRange } from "@grafana/data";
import { repeat } from "lodash";

export class Dashboard {
  id: number;
  title: string;
  uid: string;
  panels: Panel[];
  timeRange: TimeRange;

  constructor(jsonModel: any, timeRange: TimeRange) {
    const { dashboard: dashboardModel } = jsonModel;

    console.log("Raw Dashboard", dashboardModel);

    this.id = dashboardModel.id;
    this.title = dashboardModel.title;
    this.uid = dashboardModel.uid;
    this.panels = [];
    this.timeRange = timeRange;

    if (dashboardModel.panels && Array.isArray(dashboardModel.panels)) {
      this.panels = dashboardModel.panels
        .filter((panel: any) => panel.type === "row")
        .filter((panel: any) => panel.title)
        .map((panel: any) => this.createPanel(panel));
    }
  }

  private createPanel = (panelGroupJson: any) => {
    let panels: SubPanel[] = [];
    if (panelGroupJson.panels && Array.isArray(panelGroupJson.panels)) {
      panels = panelGroupJson.panels
        .filter((panel: any) => panel.title)
        .map((subPanel: any) => this.createSubPanel(subPanel));
    }

    return new Panel(panelGroupJson.title, panelGroupJson.type, panels);
  };

  private createSubPanel = (panelJson: any) => {
    let panels: SubPanel[] = [];
    if (panelJson.panels && Array.isArray(panelJson.panels)) {
      panels = panelJson.panels.map((subPanel: any) => this.createSubPanel(subPanel));
    }

    return new SubPanel(
      panelJson.title,
      panelJson.type,
      panelJson.datasource,
      this.timeRange,
      panelJson.targets,
      panels
    );
  };

  findPanel = (title: string) => {
    for (let panelGroup of this.panels) {
      const panel = panelGroup.findPanel(title);
      if (panel) {
        return panel;
      }
    }

    return undefined;
  };

  toMarkdown = (maxDepth = 2) => {
    let markdown = "";
    for (const panel of this.panels) {
      markdown += panel.toMarkdown(maxDepth);
      markdown += "\n";
    }

    return markdown.trimEnd();
  };
}

class Panel {
  title: string;
  type: string;
  panels: SubPanel[];

  constructor(title: string, type: string, panels: SubPanel[]) {
    this.title = title;
    this.type = type;
    this.panels = panels;
  }

  rootElement = () => {
    const panelElements = Array.from(document.querySelectorAll(".dashboard-row"));
    // @ts-ignore
    const panelElement = panelElements.find((element) => element.innerText.includes(this.title));
    return panelElement;
  };

  toggle = () => {
    const panelElement = this.rootElement();
    if (!panelElement) {
      throw new Error(`Panel with title ${this.title} not found`);
    }
    const toggleButton = panelElement.querySelector(".dashboard-row__title") as HTMLButtonElement;
    toggleButton?.click();
  };

  isCollapsed = () => {
    const panelElement = this.rootElement();
    if (!panelElement) {
      throw new Error(`Panel with title ${this.title} not found`);
    }
    return panelElement.classList.contains("dashboard-row--collapsed");
  };

  findPanel = (title: string): SubPanel | undefined => {
    for (let panel of this.panels) {
      if (panel.title === title) {
        return panel;
      }

      const foundPanel = panel.findPanel(title);
      if (foundPanel) {
        return foundPanel;
      }
    }

    return undefined;
  };

  toMarkdown(maxDepth: number) {
    const depth = 1;
    let markdown = "";
    markdown += `- ${this.title} - isOpen: ${!this.isCollapsed()}\n`;
    for (const panel of this.panels) {
      markdown += panel.toMarkdown(depth + 1, maxDepth);
      markdown += "\n";
    }

    return markdown.trimEnd();
  }
}

class SubPanel {
  title: string;
  type: string;
  datasource?: DataSource;
  targets?: PanelTarget[];
  panels: SubPanel[];
  timeRange: TimeRange;

  constructor(
    title: string,
    type: string,
    datasource: DataSource,
    timeRange: TimeRange,
    targets: PanelTarget[],
    panels: SubPanel[]
  ) {
    this.title = title;
    this.type = type;
    this.datasource = datasource;
    this.timeRange = timeRange;
    this.targets = targets;
    this.panels = panels;
  }

  findPanel = (title: string): SubPanel | undefined => {
    // look through panels recursively to find the panel with matching title
    for (let panel of this.panels) {
      if (panel.title === title) {
        return panel;
      }

      const foundPanel = panel.findPanel(title);
      if (foundPanel) {
        return foundPanel;
      }
    }

    return undefined;
  };

  fetchData = async () => {
    const url = "/api/ds/query";

    const response = await fetch(url, {
      method: "POST",
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
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();
    console.log("Fetched data ::: ", json);
    return json;
  };

  csvData = async () => {
    let csvs: string[] = [];

    const jsonResponse = await this.fetchData();
    for (let resultSetKey in jsonResponse.results) {
      const frames = jsonResponse.results[resultSetKey].frames;
      frames.forEach((frame: any) => {
        const fields = frame.schema.fields;
        const headers = fields.map((field: any) => field.name);
        const data = frame.data.values;
        const rows = data[0].map((_: any, colIndex: number) => data.map((row: any) => row[colIndex]));

        let csvContent = headers.join(",") + "\n"; // Add headers
        rows.forEach((row: any) => {
          csvContent += row.join(",") + "\n"; // Add each row
        });

        csvs.push(csvContent);
      });
    }

    return csvs;
  };

  getSqlQuery = (rawSql: string) => {
    const variables = getTemplateSrv().getVariables();

    const templateVariables = variables.map((variable) => ({
      name: variable.name,
      // @ts-ignore
      value: variable.current.value,
    }));

    for (let { name, value } of templateVariables) {
      const pattern = new RegExp(`\\$\{${name}\}`, "g");
      rawSql = rawSql.replace(pattern, value);
    }

    return rawSql;
  };

  toMarkdown(depth: number, maxDepth: number) {
    let markdown = "";
    markdown += `${repeat("  ", depth - 1)}- ${this.title}\n`;
    depth += 1;

    if (depth > maxDepth) {
      return markdown.trimEnd();
    }

    for (const panel of this.panels) {
      markdown += panel.toMarkdown(depth, maxDepth - 1);
      markdown += "\n";
    }

    return markdown.trimEnd();
  }
}

interface DataSource {
  type: string;
  uid: string;
}

export interface PanelTarget {
  datasource: DataSource;
  format: number;
  meta: any;
  queryType: string;
  rawSql: string;
  refId: string;
  // selectedFormat: number
}
