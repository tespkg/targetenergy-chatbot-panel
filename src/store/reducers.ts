import { handleActions } from "redux-actions";
import update from "immutability-helper";
import * as Actions from "./actions";
import { StoreType } from "./types/general-state-types";
import { last, uniqueId } from "lodash";
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from "../commons/enums/Chatbot";
import { ChatBotMessage } from "../commons/types/ChatMessagePanelTypes";

const initialState: StoreType = {
  traces: [],
};

export default handleActions<StoreType, any>(
  {
    [Actions.AddTrace.toString()](state = initialState, { payload }: ReturnType<typeof Actions.AddTrace>) {
      const { trace } = payload;
      const newTraces = [...state.traces, trace];
      return update(state, {
        traces: {
          $set: newTraces,
        },
      });
    },
    [Actions.SetInoPanelMessageId.toString()](
      state = initialState,
      { payload }: ReturnType<typeof Actions.SetInoPanelMessageId>
    ) {
      const { messageId } = payload;
      return update(state, {
        infoPanelMessageId: {
          $set: messageId,
        },
      });
    },
    [Actions.AddChatbotMessage.toString()](
      state = initialState,
      { payload }: ReturnType<typeof Actions.AddChatbotMessage>
    ) {
      const { messages } = payload;
      let newChatContent = [...(state.chatContent || [])];
      newChatContent = [...newChatContent, ...messages];
      return update(state, {
        chatContent: {
          $set: newChatContent,
        },
      });
    },
    [Actions.DeleteChatbotMessage.toString()](
      state = initialState,
      { payload }: ReturnType<typeof Actions.DeleteChatbotMessage>
    ) {
      const { messageId, parentMessageId } = payload;
      const prevMessages = [...(state.chatContent || [])];
      if (!prevMessages) {
        return state;
      }

      const deletedMessage = prevMessages.find((message) => message.id === messageId);
      if (deletedMessage) {
        if (deletedMessage.parentMessageId === "parent") {
          // If the deleted message is parent itself, we need to delete it and all messages which their parent is currently deleted message.
          const newMessages = prevMessages.filter(
            (message) => message.id !== messageId && message.parentMessageId !== messageId
          );
          return update(state, {
            chatContent: {
              $set: newMessages,
            },
          });
        } else {
          // If the deleted message is child, we need to delete it, the parent and all messages which a mutual parent message.
          const newMessages = prevMessages.filter(
            (message) =>
              message.id !== messageId && message.id !== parentMessageId && message.parentMessageId !== parentMessageId
          );
          return update(state, {
            chatContent: {
              $set: newMessages,
            },
          });
        }
      }
      return state;
    },
    [Actions.ResetChatbotMessage.toString()](state = initialState) {
      return update(state, {
        chatContent: {
          $set: undefined,
        },
      });
    },
    [Actions.UpdateChatbotMessage.toString()](
      state = initialState,
      { payload }: ReturnType<typeof Actions.UpdateChatbotMessage>
    ) {
      const { message, parentMessageId } = payload;
      if (state.chatContent !== undefined) {
        const prevMessages = [...state.chatContent];
        const lastMessage = last(prevMessages)!;
        if (lastMessage.role === CHATBOT_ROLE.ASSISTANT) {
          const newMessages = [
            ...prevMessages.slice(0, prevMessages.length - 1),
            { ...lastMessage, ...message, message: lastMessage.message + message.message } as ChatBotMessage,
          ];
          return update(state, {
            chatContent: { $set: newMessages },
          });
        } else {
          const newMessages = [
            ...prevMessages,
            {
              id: uniqueId("text_message"),
              parentMessageId: parentMessageId,
              role: CHATBOT_ROLE.ASSISTANT,
              includeInContextHistory: true,
              includeInChatPanel: true,
              type: SUPPORTED_MESSAGE_TYPE.TEXT,
              time: new Date().getTime(),
              ...message,
            } as ChatBotMessage,
          ];
          return update(state, { chatContent: { $set: newMessages } });
        }
      }
      return state;
    },
  },
  initialState
);
