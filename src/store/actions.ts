import { createAction } from "redux-actions";
import { sprintf } from "sprintf-js";
import { LlmTrace } from "../core/orchestration/llm-callbacks";
//
const ACTION_PREFIX = "CHATBOT_PANEL_%s";
export const AddTrace = createAction(sprintf(ACTION_PREFIX, "ADD_TRACE"), (trace: LlmTrace) => ({ trace }));

export const SetInoPanelMessageId = createAction(
  sprintf(ACTION_PREFIX, "SET_INFO_PANEL_MESSAGE_ID"),
  (messageId: string) => ({ messageId })
);
