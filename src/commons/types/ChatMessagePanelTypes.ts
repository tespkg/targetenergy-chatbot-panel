import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from "../enums/Chatbot";

export type ChatBotMessage = {
  role: CHATBOT_ROLE;
  message: string;
  audio?: Blob;
  audioUrl?: string;
  type: SUPPORTED_MESSAGE_TYPE;
  id: string;
  parentMessageId?: string | "parent";
  includeInContextHistory: boolean;
  includeInChatPanel: boolean;
};
