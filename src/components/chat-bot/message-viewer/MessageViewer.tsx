import React, { Fragment } from 'react'
import classNames from 'classnames'
import Markdown from 'markdown-to-jsx'
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from 'commons/enums/Chatbot'
import { MessageViewerViewModel } from './MessageViewerViewModel'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import UserAvatar from 'img/icons/user_avatar.svg'
import { StreamingAudioPlayer } from '../../audio-player/StreamingAudioPlayer'
import { Button } from '../../button/Button'
import TrashBinIcon from 'img/icons/trashbin.svg'

import './message-viewer.scss'

interface Props {
  className?: string
  isChatbotBusy: boolean
  viewModel: MessageViewerViewModel
  onDelete: (messageId: string, parentMessageId: string) => void
}
export const MessageViewer = ({ className, isChatbotBusy, viewModel, onDelete }: Props) => {
  /** Extract Properties from view model */
  const { message, audio, role, id, parentMessageId, type } = viewModel

  /** Renderer */
  return (
    <div
      key={id}
      className={classNames(className, 'messageViewer', {
        user: role === CHATBOT_ROLE.USER,
        assistant: role === CHATBOT_ROLE.ASSISTANT,
      })}
    >
      <AvatarViewer role={role} />
      <div
        className={classNames('messageViewer-message', {
          user: role === CHATBOT_ROLE.USER,
          assistant: role === CHATBOT_ROLE.ASSISTANT,
          audio: type === SUPPORTED_MESSAGE_TYPE.AUDIO,
        })}
      >
        {type === SUPPORTED_MESSAGE_TYPE.AUDIO ? (
          <AudioMessageViewer audio={audio} id={id} parentId={parentMessageId} onDelete={onDelete} role={role} />
        ) : (
          <TextMessageViewer
            message={message}
            role={role}
            id={id}
            parentId={parentMessageId}
            isChatbotBusy={isChatbotBusy}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}

const AvatarViewer = ({ role }: { role: CHATBOT_ROLE }) => {
  /** Renderer */
  return (
    <div
      className={classNames('messageViewer-avatar', {
        user: role === CHATBOT_ROLE.USER,
        assistant: role === CHATBOT_ROLE.ASSISTANT,
      })}
      title={role === CHATBOT_ROLE.ASSISTANT ? 'Bot' : 'You'}
    >
      {role === CHATBOT_ROLE.ASSISTANT ? (
        <img className="messageViewer-avatar-image" src={AssistantAvatar} alt="Bot" />
      ) : (
        <img className="messageViewer-avatar-image" src={UserAvatar} alt="User" />
      )}
    </div>
  )
}
//
const TextMessageViewer = ({
  message,
  role,
  id,
  parentId,
  isChatbotBusy,
  onDelete,
}: {
  message: string
  role: CHATBOT_ROLE
  isChatbotBusy: boolean
  parentId: string
  id: string
  onDelete: (id: string, parentId: string) => void
}) => {
  /** Renderer */
  return (
    <Fragment>
      <Markdown
        className={classNames('messageViewer-message-messageText', 'markdown-html', {
          user: role === CHATBOT_ROLE.USER,
          assistant: role === CHATBOT_ROLE.ASSISTANT,
        })}
      >
        {message}
      </Markdown>
      <div className={'messageViewer-message-actionsContainer'}>
        {role === CHATBOT_ROLE.ASSISTANT && <StreamingAudioPlayer text={message} id={id} disabled={isChatbotBusy} />}
        {role === CHATBOT_ROLE.USER && (
          <Button
            title="Clear"
            displayTitle={false}
            frame={false}
            imageSource={TrashBinIcon}
            imageSize={16}
            onClick={() => {
              onDelete(id, parentId)
            }}
          />
        )}
      </div>
    </Fragment>
  )
}
//
const AudioMessageViewer = ({
  id,
  parentId,
  role,
  audio,
  onDelete,
}: {
  audio?: Blob
  role: CHATBOT_ROLE
  id: string
  parentId: string
  onDelete: (id: string, parentId: string) => void
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
        <Button
          title="Clear"
          displayTitle={false}
          frame={false}
          imageSource={TrashBinIcon}
          imageSize={16}
          onClick={() => {
            onDelete(id, parentId)
          }}
        />
      )}
    </Fragment>
  ) : null
}
