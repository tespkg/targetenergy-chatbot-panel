import { LTTB } from "downsample/methods/LTTB";
import { getTemplateSrv } from "@grafana/runtime";
import { TimeRange } from "@grafana/data";
import { repeat } from "lodash";
import { toCsvCell } from "../utils/string-utils";

interface MarkdownOptions {
  includeType: boolean;
  includeGroups: boolean;
  includeDescription: boolean;
}

export class Dashboard {
  id: number;
  title: string;
  uid: string;
  panelGroups: PanelGroup[];
  timeRange: TimeRange;

  constructor(jsonModel: any, timeRange: TimeRange) {
    const { dashboard: dashboardModel } = jsonModel;

    console.log("Raw Dashboard", dashboardModel);

    this.id = dashboardModel.id;
    this.title = dashboardModel.title;
    this.uid = dashboardModel.uid;
    this.panelGroups = [];
    this.timeRange = timeRange;

    if (dashboardModel.panels && Array.isArray(dashboardModel.panels)) {
      this.panelGroups = dashboardModel.panels
        .filter((panel: any) => panel.type === "row")
        .filter((panel: any) => panel.title)
        .map((panel: any) => this.createPanelGroup(panel));
    }
  }

  private createPanelGroup = (panelGroupJson: any) => {
    let panels: Panel[] = [];
    if (panelGroupJson.panels && Array.isArray(panelGroupJson.panels)) {
      panels = panelGroupJson.panels
        .filter((panel: any) => panel.title)
        .map((subPanel: any) => this.createPanel(subPanel));
    }

    return new PanelGroup(panelGroupJson.title, panelGroupJson.type, panels);
  };

  private createPanel = (panelJson: any) => {
    let panels: Panel[] = [];
    if (panelJson.panels && Array.isArray(panelJson.panels)) {
      panels = panelJson.panels.map((subPanel: any) => this.createPanel(subPanel));
    }

    return new Panel(
      panelJson.title,
      panelJson.description,
      panelJson.type,
      panelJson.datasource,
      this.timeRange,
      panelJson.targets,
      panels
    );
  };

  findPanel = (title: string) => {
    for (let panelGroup of this.panelGroups) {
      if (panelGroup.shouldSkip()) {
        continue;
      }

      const panel = panelGroup.findPanel(title);
      if (panel) {
        return panel;
      }
    }

    return undefined;
  };

  toMarkdown = (
    maxDepth = 2,
    opts: MarkdownOptions = { includeDescription: false, includeGroups: true, includeType: true }
  ) => {
    let markdown = "";
    for (const panelGroup of this.panelGroups) {
      const panelsMarkdown = panelGroup.toMarkdown(maxDepth, opts);
      if (panelsMarkdown) {
        markdown += panelsMarkdown + "\n";
      }
    }

    return markdown.trimEnd();
  };
}

class PanelGroup {
  title: string;
  type: string;
  panels: Panel[];

  constructor(title: string, type: string, panels: Panel[]) {
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

  findPanel = (title: string): Panel | undefined => {
    for (let panel of this.panels) {
      if (panel.shouldSkip()) {
        continue;
      }

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

  toMarkdown(maxDepth: number, opts: MarkdownOptions) {
    if (this.shouldSkip()) {
      return "";
    }

    const depth = opts.includeGroups ? 1 : 0;
    let markdown = "";
    if (opts.includeGroups) {
      markdown += `* ${this.title}`;
    }
    if (opts.includeType) {
      markdown += ` (panel_row)`;
    }
    markdown += ` - isOpen: ${!this.isCollapsed()}`;
    markdown += "\n";
    for (const panel of this.panels) {
      const panelMarkdown = panel.toMarkdown(depth + 1, maxDepth, opts);
      if (panelMarkdown) {
        markdown += panelMarkdown + "\n";
      }
    }

    return markdown.trimEnd();
  }

  shouldSkip = () => {
    return this.panels.every((p) => p.shouldSkip());
  };
}

class Panel {
  title: string;
  description: string;
  type: string;
  datasource?: DataSource;
  targets?: PanelTarget[];
  panels: Panel[];
  timeRange: TimeRange;

  constructor(
    title: string,
    description: string,
    type: string,
    datasource: DataSource,
    timeRange: TimeRange,
    targets: PanelTarget[],
    panels: Panel[]
  ) {
    this.title = title;
    this.description = description;
    this.type = type;
    this.datasource = datasource;
    this.timeRange = timeRange;
    this.targets = targets;
    this.panels = panels;
  }

  findPanel = (title: string): Panel | undefined => {
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
          maxDataPoints: 20,
        })),
        range: this.timeRange,
        from: `${this.timeRange.from.unix() * 1000}`,
        to: `${this.timeRange.to.unix() * 1000}`,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
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
        let rows = data[0].map((_: any, rowIndex: number) => data.map((col: any) => col[rowIndex]).map(toCsvCell));

        // TODO: this needs to be generalized but for now simply down-sample the data to 100 records
        const MAX_ROWS = 100;
        let shouldDownSample = rows.length > MAX_ROWS && rows[0].every((cell: any) => typeof cell === "number");
        if (shouldDownSample) {
          rows = LTTB(rows, 100);
        }

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

  toMarkdown(depth: number, maxDepth: number, opts: MarkdownOptions) {
    if (this.shouldSkip()) {
      return "";
    }

    let markdown = "";
    markdown += `${repeat("  ", depth - 1)}* ${this.title}`;
    if (opts.includeType) {
      markdown += ` (panel)`;
    }
    if (opts.includeDescription && this.description) {
      markdown += `: ${this.description}`;
    }
    markdown += "\n";
    depth += 1;

    if (depth > maxDepth) {
      return markdown.trimEnd();
    }

    for (const panel of this.panels) {
      markdown += panel.toMarkdown(depth, maxDepth - 1, opts);
      markdown += "\n";
    }

    return markdown.trimEnd();
  }

  shouldSkip = () => {
    return !Boolean(this.description);
  };
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
