import { DeltaEvent, ErrorEvent, SuccessEvent, WorkingEvent } from "../../core/orchestration/llm-callbacks";
import { last } from "lodash";

const generateChatStatus = (
  eventData: SuccessEvent | DeltaEvent | ErrorEvent | WorkingEvent
): string | null | undefined => {
  const { type, agent } = eventData;
  switch (type) {
    case "success":
      return null;
    case "error":
      let { message } = eventData;
      return message;

    case "working":
      const { isAgent, tool } = eventData as WorkingEvent;
      if (isAgent) {
        const correspondingAgent = last(agent.split("."));
        if (correspondingAgent) {
          switch (correspondingAgent) {
            case "main":
              return "Extracting Data from Portfolio Management Assistant";
            case "asset_tree_manager":
              return "Extracting Data from Asset Tree Manager";
            case "panel_manager":
              return "Extracting Data from Panel Manager";
          }
        }
      } else {
        return `Extracting Data from ${tool || ""}`;
      }
      break;
    case "delta":
      switch (agent) {
        case "main":
          return "Generating Response";
      }
      return undefined;
  }
  return undefined;
};

const generateErrorMessage = (text: string, color: string, prependNewLine: boolean) => {
  return `${prependNewLine ? "<br />" : ""}<strong style='color: ${color};margin: 0 2px;'>${text}</strong>`;
};

const ExportTextSaveAsDialog = async (text: string, suggestedName = "exported-file") => {
  try {
    window
      // @ts-ignore
      .showSaveFilePicker({
        mode: "write",
        startIn: "downloads",
        suggestedName: suggestedName,
        types: [
          {
            description: "Text file",
            accept: { "text/plain": [".txt"] },
          },
          {
            description: "Markdown file",
            accept: { "text/markdown": [".md"] },
          },
        ],
      })
      .then(async (handler: any) => {
        const writable = await handler.createWritable();
        await writable.write(new Blob([text], { type: "text/plain;charset=utf-8" }));
        await writable.close();
        return handler;
      });
  } catch {
    // if browser do not support save dialog API, lets download it directly!
    const anchorElement = document.createElement("a");
    anchorElement.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    anchorElement.download = `${suggestedName}.txt`;
    anchorElement.click();
  }
};
export const ChatMessagePanelUtils = { generateChatStatus, generateErrorMessage, ExportTextSaveAsDialog };
