import React, { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import TrashBin from "img/icons/trashbin.svg";
import ClearHistoryIcon from "img/icons/clear-history.svg";
import RecordIcon from "img/icons/record.svg";
import StopIcon from "img/icons/stop-circle.svg";
import { DeleteIcon } from "components/icons/DeleteIcon";
import LoadingIcon from "img/icons/animated-loading.svg";
import SendMessage from "img/icons/send-message.svg";
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from "commons/enums/Chatbot";
import { Input } from "@grafana/ui";
import { Button } from "components/button/Button";
import { last, uniqueId } from "lodash";
import { BotMessage } from "../../api/chatbot-types";
import { AssetTree } from "../../commons/types/asset-tree";
import { TreeNodeData } from "../../commons/types/tree-node-data";
import { useVoiceRecorder } from "hooks/use-voice-recorder/useVoiceRecorder";
import { runMainAgent } from "../../core/agents/main-agent";
import { transcribe } from "../../api/chatbot-api";
import { Dashboard } from "../../commons/types/dashboard-manager";
import MinimizeIcon from "img/icons/chevron-down.svg";
import {
  DeltaEvent,
  ErrorEvent,
  LlmTrace,
  MAIN_AGENT_NAME,
  SuccessEvent,
  WorkingEvent,
} from "../../core/orchestration/llm-callbacks";
import { MessageViewer } from "./message-viewer/MessageViewer";
import { MessageViewerViewModel } from "./message-viewer/MessageViewerViewModel";
import { useDebugCommand } from "../../debug/use-debug-command";
import { TimeoutError } from "../../commons/errors/timeout-error";
import { MaxTurnExceededError } from "../../core/orchestration/llm-errors";
import { OperationCancelledError } from "../../commons/errors/operation-cancelled-error";
import { useDispatch } from "react-redux";
import { AddTrace, SetInoPanelMessageId } from "../../store/actions";
import "./chat-bot.scss";

interface ChatBotMessage {
  role: CHATBOT_ROLE;
  message: string;
  audio?: Blob;
  type: SUPPORTED_MESSAGE_TYPE;
  id: string;
  parentMessageId?: string | "parent";
  includeInContextHistory: boolean;
  includeInChatPanel: boolean;
}

interface Props {
  assetTree: AssetTree;
  onToggleNodes: (node: TreeNodeData[]) => void;
  dashboard: Dashboard;
  onToggleVisibility: () => void;
  toggleInfoPanelVisible: () => void;
}

export const ChatMessagePanel = ({
  assetTree,
  onToggleNodes,
  dashboard,
  onToggleVisibility,
  toggleInfoPanelVisible,
}: Props) => {
  /** Hooks */
  const {
    audioUrl: recordedVoiceUrl,
    audioBlob: recordedVoiceBlob,
    recordingStatus,
    isPermissionDenied,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecorder();
  const dispatch = useDispatch();

  /** States and Refs */
  const abortControllerRef = useRef<AbortController | null>(null);
  const [text, setText] = useState("");
  const [chatContent, setChatContent] = useState<undefined | ChatBotMessage[]>(undefined);
  const chatContentRef = useRef(null);
  const textInputRef = useRef(null);
  const [chatbotStatus, setChatbotStatus] = useState<string | null>(null);
  const [isChatbotBusy, setChatbotBusy] = useState(false);
  const { isCommand, processCommand } = useDebugCommand();

  const addMessageToChatContent = useCallback(
    (
      text: string,
      messageId: string,
      parentMessageId: string,
      role: CHATBOT_ROLE,
      includeInContextHistory: boolean,
      includeInChatPanel: boolean
    ) => {
      if (text) {
        setChatContent((prev) => {
          return [
            ...(prev || []),
            {
              id: messageId,
              parentMessageId: parentMessageId,
              message: text,
              role: role,
              includeInContextHistory: includeInContextHistory,
              includeInChatPanel: includeInChatPanel,
              type: SUPPORTED_MESSAGE_TYPE.TEXT,
            },
          ];
        });
      }
      setText("");
    },
    []
  );
  const addVoiceToChatContent = useCallback((audio: Blob, messageId: string) => {
    if (audio) {
      setChatContent((prev) => {
        return [
          ...(prev || []),
          {
            id: messageId,
            parentMessageId: "parent",
            message: "",
            audio: audio,
            role: CHATBOT_ROLE.USER,
            includeInContextHistory: true,
            includeInChatPanel: true,
            type: SUPPORTED_MESSAGE_TYPE.AUDIO,
          },
          {
            id: uniqueId("text_message_"),
            parentMessageId: messageId,
            message: "Trying to convert the voice to text...",
            role: CHATBOT_ROLE.ASSISTANT,
            includeInContextHistory: false,
            includeInChatPanel: true,
            type: SUPPORTED_MESSAGE_TYPE.TEXT,
          },
        ];
      });
    }
  }, []);

  const addChatChunkReceived = useCallback((text: string, parentMessageId?: string) => {
    if (!text) {
      return;
    }

    setChatContent((prev) => {
      if (prev) {
        const lastMessage = last(prev)!;
        if (lastMessage.role === CHATBOT_ROLE.ASSISTANT) {
          lastMessage.message = lastMessage.message + text;
          return [...prev.slice(0, prev.length - 1), lastMessage];
        } else {
          return [
            ...prev,
            {
              id: uniqueId("text_message"),
              parentMessageId: parentMessageId,
              role: CHATBOT_ROLE.ASSISTANT,
              message: text,
              includeInContextHistory: true,
              includeInChatPanel: true,
              type: SUPPORTED_MESSAGE_TYPE.TEXT,
            } as ChatBotMessage,
          ];
        }
      } else {
        return prev;
      }
    });
  }, []);

  const getBotMessages = useCallback(
    (text: string, role: string) => {
      const chatHistory = [
        ...(chatContent || []),
        {
          id: uniqueId(),
          message: text,
          role: role,
          includeInContextHistory: true,
          includeInChatPanel: false,
          type: SUPPORTED_MESSAGE_TYPE.TEXT,
        } as ChatBotMessage,
      ];
      return chatHistory
        .filter(({ includeInContextHistory }) => includeInContextHistory)
        .map(({ message, role }) => ({
          role: role.toString(),
          content: message,
        }));
    },
    [chatContent]
  );

  const updateChatbotStatus = (eventData: SuccessEvent | DeltaEvent | ErrorEvent | WorkingEvent) => {
    const { type, message } = eventData;
    switch (type) {
      case "success":
      case "error":
        setChatbotBusy(false);
        setChatbotStatus(null);
        break;
      case "working":
        setChatbotBusy(true);
        setChatbotStatus(message);
        break;
      case "delta":
        setChatbotBusy(true);
        setChatbotStatus(message);
        break;
    }
  };

  const cancelAgent = useCallback(() => {
    if (abortControllerRef.current) {
      console.log(">>>>>>>> Cancelling agent");
      abortControllerRef.current.abort();
    }
  }, []);

  const runAgents = useCallback(
    async (messages: BotMessage[], parentMessageId: string) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await runMainAgent(messages, {
          app: {
            assetTree: assetTree,
            dashboard: dashboard,
            toggleAssetNodes: onToggleNodes,
          },
          options: {
            abortSignal: abortController.signal,
            callbacks: {
              onSuccess: (eventData: SuccessEvent) => {
                console.log(eventData);
                updateChatbotStatus(eventData);
              },
              onDelta: (eventData: DeltaEvent) => {
                const { message, agent } = eventData;
                if (agent === MAIN_AGENT_NAME) {
                  addChatChunkReceived(message, parentMessageId);
                }
                // updateChatbotStatus(eventData)
              },
              onError: (eventData: ErrorEvent) => {
                console.log(eventData);
                updateChatbotStatus(eventData);
              },
              onWorking: (eventData: WorkingEvent) => {
                console.log(eventData);
                updateChatbotStatus(eventData);
              },
              onTrace: (trace: LlmTrace) => {
                console.log("Trace", trace);
                dispatch(AddTrace({ ...trace, parentId: parentMessageId }));
              },
            },
          },
        });
      } catch (e) {
        console.error("Main agent errored: ", e);
        if (e instanceof TimeoutError) {
          // TODO: special handling
          console.log("It was a timeout error");
        }
        if (e instanceof OperationCancelledError) {
          // TODO: special handling
          console.log("It was cancelled");
        }
        if (e instanceof MaxTurnExceededError) {
          // TODO: special handling
          console.log("It reached its max turns");
        }

        // TODO: handle the error properly and show it to the user.
        setChatbotBusy(false);
        setChatbotStatus(null);
      }
    },
    [assetTree, dashboard, onToggleNodes, addChatChunkReceived, dispatch]
  );

  const handleNewUserMessage = useCallback(async () => {
    if (isCommand(text)) {
      await processCommand(text, {
        dashboard,
        assetTree: assetTree,
      });
      return;
    }

    const messageId = uniqueId("text_message_");
    addMessageToChatContent(text, messageId, "parent", CHATBOT_ROLE.USER, true, true);
    await runAgents(getBotMessages(text, CHATBOT_ROLE.USER), messageId);
  }, [isCommand, text, addMessageToChatContent, runAgents, getBotMessages, processCommand, dashboard, assetTree]);

  const handleNewUserVoiceMessage = useCallback(
    async (voice: Blob) => {
      const messageId = uniqueId("audio_message_");
      addVoiceToChatContent(voice, messageId);
      const transcription = await transcribe(voice);
      const transcriptionMessageId = uniqueId("text_message_");
      addMessageToChatContent(transcription, transcriptionMessageId, messageId, CHATBOT_ROLE.USER, true, true);
      await runAgents(getBotMessages(transcription, CHATBOT_ROLE.USER), messageId);
    },
    [addMessageToChatContent, addVoiceToChatContent, runAgents, getBotMessages]
  );

  /** Callbacks */
  const onDeleteMessage = (messageId: string, parentMessageId: string) => {
    console.log("Going to delete message with id: ", messageId);
    setChatContent((prevMessages) => {
      if (!prevMessages) {
        return prevMessages;
      }

      const deletedMessage = prevMessages.find((message) => message.id === messageId);
      if (deletedMessage) {
        if (deletedMessage.parentMessageId === "parent") {
          // If the deleted message is parent itself, we need to delete it and all messages which their parent is currently deleted message.
          return prevMessages.filter((message) => message.id !== messageId && message.parentMessageId !== messageId);
        } else {
          // If the deleted message is child, we need to delete it, the parent and all messages which a mutual parent message.
          return prevMessages.filter(
            (message) =>
              message.id !== messageId && message.id !== parentMessageId && message.parentMessageId !== parentMessageId
          );
        }
      }
      return prevMessages;
    });
  };
  //
  const onMessageInfo = (messageId: string, parentMessageId: string) => {
    dispatch(SetInoPanelMessageId(parentMessageId));
    toggleInfoPanelVisible();
  };
  //
  const initializeChatContext = useCallback(() => {
    setChatContent(undefined);
    const messageId = uniqueId("text_message_");
    addMessageToChatContent(`How can I help you?`, messageId, "parent", CHATBOT_ROLE.ASSISTANT, false, true);
  }, [addMessageToChatContent]);
  //
  useEffect(() => {
    if (chatContent === undefined) {
      initializeChatContext();
    }
  }, [chatContent, initializeChatContext]);
  //
  useEffect(() => {
    if (chatContentRef && chatContentRef.current) {
      // @ts-ignore
      chatContentRef.current.scrollTo(0, chatContentRef.current.scrollHeight * 100);
    }
  }, [chatContent]);
  //

  useEffect(() => {
    if (textInputRef && textInputRef.current) {
      // @ts-ignore
      textInputRef.current.focus();
    }
  }, [textInputRef, chatContent]);

  /** Renderer */
  return (
    <div className={classNames("ChatBot")}>
      <div className="ChatBot-header">
        <span className="ChatBot-header-text">Talk to Portfolio Management</span>
        <div className="ChatBot-header-actions">
          <Button
            title="Clear"
            displayTitle={false}
            imageSource={ClearHistoryIcon}
            imageSize={16}
            onClick={initializeChatContext}
          />
          <Button
            title="Minimize"
            displayTitle={false}
            imageSource={MinimizeIcon}
            imageSize={12}
            onClick={onToggleVisibility}
          />
        </div>
      </div>
      <div className={classNames("ChatBot-chatPanel")} ref={chatContentRef}>
        {chatContent &&
          chatContent
            .filter(({ includeInChatPanel }) => includeInChatPanel)
            .map(({ message, type, audio, id, role, parentMessageId }, index, self) => {
              const viewModel = new MessageViewerViewModel();
              viewModel.message = message;
              viewModel.type = type;
              viewModel.audio = audio;
              viewModel.id = id;
              viewModel.parentMessageId = parentMessageId || "parent";
              viewModel.role = role;
              return (
                <MessageViewer
                  key={id}
                  viewModel={viewModel}
                  isTextToSpeechDisabled={isChatbotBusy && index === self.length - 1}
                  isDeleteMessageDisabled={isChatbotBusy}
                  onDelete={onDeleteMessage}
                  onInfo={onMessageInfo}
                />
              );
            })}
      </div>
      {chatbotStatus !== null && (
        <div className="ChatBot-statusContainer">
          <span className="ChatBot-statusContainer-statusText">{chatbotStatus}</span>
          <img className="ChatBot-statusContainer-loadingIcon" src={LoadingIcon} alt="" />
        </div>
      )}
      <div className="ChatBot-inputContainer">
        {recordedVoiceUrl ? (
          <audio
            className="ChatBot-inputContainer-voicePlaceHolder"
            src={recordedVoiceUrl}
            controls
            controlsList="nodownload"
          />
        ) : (
          <Input
            className={classNames("searchInput")}
            label="Search"
            placeholder="Search"
            value={text}
            title="wildcard supported"
            onChange={(e) => {
              const value = e.currentTarget.value;
              setText(value);
            }}
            loading={isChatbotBusy}
            onKeyDown={(event) => {
              if (!event.shiftKey && event.key === "Enter" && !isChatbotBusy) {
                event.preventDefault();
                handleNewUserMessage();
              }
            }}
            style={{
              marginBottom: "8px",
            }}
            autoFocus
            addonAfter={
              isChatbotBusy && (
                <Button
                  className="ChatBot-inputContainer-buttonContainer send"
                  title={"Cancel"}
                  displayTitle={false}
                  icon={<DeleteIcon width={16} height={16} color={"#ff0000"} />}
                  imageSize={16}
                  onClick={cancelAgent}
                />
              )
            }
          >
            {/*<div>Hi</div>*/}
          </Input>
        )}
        {!recordedVoiceUrl && (
          <Button
            className="ChatBot-inputContainer-buttonContainer record"
            title={isPermissionDenied ? "Permission Denied" : recordingStatus === "inactive" ? "Record" : "Stop"}
            displayTitle={false}
            disabled={isPermissionDenied}
            imageSource={recordingStatus === "inactive" ? RecordIcon : StopIcon}
            imageSize={16}
            onClick={() => {
              recordingStatus === "inactive" ? startRecording() : stopRecording();
            }}
          />
        )}
        {recordedVoiceUrl && (
          <Button
            className="ChatBot-inputContainer-buttonContainer send"
            title={"Send"}
            displayTitle={false}
            imageSource={SendMessage}
            imageSize={16}
            onClick={() => {
              if (recordedVoiceBlob && !isChatbotBusy) {
                handleNewUserVoiceMessage(recordedVoiceBlob);
                resetRecording();
              }
            }}
          />
        )}
        {recordedVoiceUrl && (
          <Button
            className="ChatBot-inputContainer-buttonContainer reset"
            title={"Reset"}
            displayTitle={false}
            imageSource={TrashBin}
            imageSize={16}
            onClick={resetRecording}
          />
        )}
      </div>
    </div>
  );
};
