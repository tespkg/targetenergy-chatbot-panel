import { createAction } from "redux-actions";
import { sprintf } from "sprintf-js";
import { LlmTrace } from "../core/orchestration/llm-callbacks";
//
const ACTION_PREFIX = "CHATBOT_PANEL_";
export const AddTrace = createAction(sprintf(ACTION_PREFIX, "ADD_TRACE"), (trace: LlmTrace) => ({ trace }));
