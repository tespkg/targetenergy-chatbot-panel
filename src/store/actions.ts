import { createAction } from "redux-actions";
import { sprintf } from "sprintf-js";
import { LlmTrace } from "../core/orchestration/llm-callbacks";
import { ChatBotMessage } from "../commons/types/ChatMessagePanelTypes";
//
const ACTION_PREFIX = "CHATBOT_PANEL_%s";
export const AddTrace = createAction(sprintf(ACTION_PREFIX, "ADD_TRACE"), (trace: LlmTrace) => ({ trace }));

export const SetInoPanelMessageId = createAction(
  sprintf(ACTION_PREFIX, "SET_INFO_PANEL_MESSAGE_ID"),
  (messageId: string) => ({ messageId })
);

export const AddChatbotMessage = createAction(
  sprintf(ACTION_PREFIX, "ADD_CHATBOT_MESSAGE"),
  (messages: ChatBotMessage[]) => ({
    messages,
  })
);

export const DeleteChatbotMessage = createAction(
  sprintf(ACTION_PREFIX, "DELETE_CHATBOT_MESSAGE"),
  (messageId: string, parentMessageId: string) => ({
    messageId,
    parentMessageId,
  })
);

export const UpdateChatbotMessage = createAction(
  sprintf(ACTION_PREFIX, "UPDATE_CHATBOT_MESSAGE"),
  (text: string, parentMessageId: string) => ({
    text,
    parentMessageId,
  })
);

export const ResetChatbotMessage = createAction(sprintf(ACTION_PREFIX, "RESET_CHATBOT_MESSAGE"), () => ({}));
