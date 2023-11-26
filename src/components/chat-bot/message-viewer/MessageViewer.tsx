import React, { Fragment } from 'react'
import classNames from 'classnames'
import Markdown from 'markdown-to-jsx'
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from 'commons/enums/Chatbot'
import { MessageViewerViewModel } from './MessageViewerViewModel'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import UserAvatar from 'img/icons/user_avatar.svg'
import { AudioPlayer } from '../../audio-player/AudioPlayer'

import './message-viewer.scss'

interface Props {
  className?: string
  viewModel: MessageViewerViewModel
}
export const MessageViewer = ({ className, viewModel }: Props) => {
  /** Extract Properties from view model */
  const { message, audio, role, id, type } = viewModel

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
          <AudioMessageViewer audio={audio} />
        ) : (
          <TextMessageViewer message={message} role={role} />
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
const TextMessageViewer = ({ message, role }: { message: string; role: CHATBOT_ROLE }) => {
  /** Renderer */
  return (
    <Fragment>
      <Markdown
        className={classNames('messageViewer-message-messageText', {
          user: role === CHATBOT_ROLE.USER,
          assistant: role === CHATBOT_ROLE.ASSISTANT,
        })}
      >
        {message}
      </Markdown>
      {role === CHATBOT_ROLE.ASSISTANT && (
        <div className={'messageViewer-message-actionsContainer'}>
          <AudioPlayer text={message} />
        </div>
      )}
    </Fragment>
  )
}
//
const AudioMessageViewer = ({ audio }: { audio?: Blob }) => {
  /** Renderer */
  return audio ? (
    <audio
      className="messageViewer-message-messageVoice"
      src={URL.createObjectURL(audio)}
      controls
      controlsList="nodownload"
    />
  ) : null
}
