import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from "../../../commons/enums/Chatbot";

export class MessageViewerViewModel {
  message = "";
  role: CHATBOT_ROLE = CHATBOT_ROLE.USER;
  id = "";
  parentMessageId = "";
  type: SUPPORTED_MESSAGE_TYPE = SUPPORTED_MESSAGE_TYPE.TEXT;
  audio?: Blob;
  audioUrl?: string;
}
