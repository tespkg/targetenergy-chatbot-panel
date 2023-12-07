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

export const ChatMessagePanelUtils = { generateChatStatus };
