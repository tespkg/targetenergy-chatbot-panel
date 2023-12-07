import React, { Fragment } from "react";
import classNames from "classnames";
import Markdown from "markdown-to-jsx";
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from "commons/enums/Chatbot";
import { MessageViewerViewModel } from "./MessageViewerViewModel";
import AssistantAvatar from "img/icons/assisstant_avatar.svg";
import UserAvatar from "img/icons/user_avatar.svg";
import { StreamingAudioPlayer } from "../../audio-player/StreamingAudioPlayer";
import { Button } from "../../button/Button";
import { DeleteIcon } from "../../icons/DeleteIcon";
import "./message-viewer.scss";
import InfoIcon from "../../../img/icons/info-icon.svg";
import { CopyIcon } from "../../icons/CopyIcon";

interface Props {
  className?: string;
  isDeleteMessageDisabled: boolean;
  isTextToSpeechDisabled: boolean;
  viewModel: MessageViewerViewModel;
  onDelete: (messageId: string, parentMessageId: string) => void;
  onInfo: (messageId: string, parentMessageId: string) => void;
}

export const MessageViewer = ({
  className,
  isDeleteMessageDisabled,
  isTextToSpeechDisabled,
  viewModel,
  onDelete,
  onInfo,
}: Props) => {
  /** Extract Properties from view model */
  const { message, audio, role, id, parentMessageId, type } = viewModel;

  /** Renderer */
  return (
    <div
      key={id}
      className={classNames(className, "messageViewer", {
        user: role === CHATBOT_ROLE.USER,
        assistant: role === CHATBOT_ROLE.ASSISTANT,
      })}
    >
      <AvatarViewer role={role} />
      <div
        className={classNames("messageViewer-message", {
          user: role === CHATBOT_ROLE.USER,
          assistant: role === CHATBOT_ROLE.ASSISTANT,
          audio: type === SUPPORTED_MESSAGE_TYPE.AUDIO,
        })}
      >
        {type === SUPPORTED_MESSAGE_TYPE.AUDIO ? (
          <AudioMessageViewer
            audio={audio}
            id={id}
            parentId={parentMessageId}
            onDelete={onDelete}
            role={role}
            isDeleteMessageDisabled={isDeleteMessageDisabled}
          />
        ) : (
          <TextMessageViewer
            message={message}
            role={role}
            id={id}
            parentId={parentMessageId}
            isTextToSpeechDisabled={isTextToSpeechDisabled}
            isDeleteMessageDisabled={isDeleteMessageDisabled}
            onDelete={onDelete}
            onInfo={onInfo}
          />
        )}
      </div>
    </div>
  );
};

const AvatarViewer = ({ role }: { role: CHATBOT_ROLE }) => {
  /** Renderer */
  return (
    <div
      className={classNames("messageViewer-avatar", {
        user: role === CHATBOT_ROLE.USER,
        assistant: role === CHATBOT_ROLE.ASSISTANT,
      })}
      title={role === CHATBOT_ROLE.ASSISTANT ? "Bot" : "You"}
    >
      {role === CHATBOT_ROLE.ASSISTANT ? (
        <img className="messageViewer-avatar-image" src={AssistantAvatar} alt="Bot" />
      ) : (
        <img className="messageViewer-avatar-image" src={UserAvatar} alt="User" />
      )}
    </div>
  );
};
//
const TextMessageViewer = ({
  message,
  role,
  id,
  parentId,
  isTextToSpeechDisabled,
  isDeleteMessageDisabled,
  onDelete,
  onInfo,
}: {
  message: string;
  role: CHATBOT_ROLE;
  isTextToSpeechDisabled: boolean;
  isDeleteMessageDisabled: boolean;
  parentId: string;
  id: string;
  onDelete: (id: string, parentId: string) => void;
  onInfo: (id: string, parentId: string) => void;
}) => {
  /** Renderer */
  return (
    <Fragment>
      <Markdown
        className={classNames("messageViewer-message-messageText", "markdown-html", {
          user: role === CHATBOT_ROLE.USER,
          assistant: role === CHATBOT_ROLE.ASSISTANT,
        })}
      >
        {message}
      </Markdown>
      <div
        className={classNames("messageViewer-message-actionsContainer", {
          user: role === CHATBOT_ROLE.USER,
          assistant: role === CHATBOT_ROLE.ASSISTANT,
        })}
      >
        {role === CHATBOT_ROLE.ASSISTANT && (
          <StreamingAudioPlayer text={message} id={id} disabled={isTextToSpeechDisabled} />
        )}
        {role === CHATBOT_ROLE.USER && (
          <div className={classNames({ autoHideButtonContainer: role === CHATBOT_ROLE.USER })}>
            <Button
              title="Clear"
              displayTitle={false}
              frame={false}
              icon={<DeleteIcon width={16} height={16} color={"#1e90ff"} />}
              imageSize={16}
              disabled={isDeleteMessageDisabled}
              onClick={() => {
                onDelete(id, parentId);
              }}
            />
          </div>
        )}
        {role === CHATBOT_ROLE.ASSISTANT && (
          <Button
            title="Info"
            frame={false}
            displayTitle={false}
            imageSource={InfoIcon}
            imageSize={16}
            onClick={() => {
              onInfo(id, parentId);
            }}
          />
        )}
        <div className={classNames({ autoHideButtonContainer: role === CHATBOT_ROLE.USER })}>
          <Button
            title="Copy"
            displayTitle={false}
            frame={false}
            icon={<CopyIcon width={16} height={16} color={role === CHATBOT_ROLE.USER ? "#1e90ff" : "#1c274c"} />}
            imageSize={16}
            onClick={() => {
              navigator.clipboard.writeText(message);
            }}
          />
        </div>
      </div>
    </Fragment>
  );
};
//
const AudioMessageViewer = ({
  id,
  parentId,
  role,
  audio,
  onDelete,
  isDeleteMessageDisabled,
}: {
  audio?: Blob;
  role: CHATBOT_ROLE;
  id: string;
  parentId: string;
  isDeleteMessageDisabled: boolean;
  onDelete: (id: string, parentId: string) => void;
}) => {
  /** Renderer */
  return audio ? (
    <Fragment>
      <audio
        className="messageViewer-message-messageVoice"
        src={URL.createObjectURL(audio)}
        controls
        controlsList="nodownload"
      />
      {role === CHATBOT_ROLE.USER && (
        <div className={classNames({ autoHideButtonContainer: role === CHATBOT_ROLE.USER })}>
          <Button
            title="Clear"
            displayTitle={false}
            frame={false}
            icon={<DeleteIcon width={16} height={16} color={"rgba(0,0,0,0.6)"} />}
            imageSize={16}
            disabled={isDeleteMessageDisabled}
            onClick={() => {
              onDelete(id, parentId);
            }}
          />
        </div>
      )}
    </Fragment>
  ) : null;
};
