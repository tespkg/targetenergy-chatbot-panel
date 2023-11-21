import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import TrashBin from 'img/icons/trashbin.svg'
import RecordIcon from 'img/icons/record.svg'
import StopIcon from 'img/icons/stop-circle.svg'
import SendMessage from 'img/icons/send-message.svg'

import UserAvatar from 'img/icons/user_avatar.svg'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from 'commons/enums/Chatbot'
import { Input } from '@grafana/ui'
import { Button } from 'components/button/Button'
import Markdown from 'markdown-to-jsx'
import { last, uniqueId } from 'lodash'
import { BotMessage } from '../../api/bot-types'
import { AssetTree } from '../../commons/utils/asset-tree'
import { TreeNodeData } from '../../commons/types/TreeNodeData'
import { useVoiceRecorder } from 'hooks/use-voice-recorder/useVoiceRecorder'
import { runAgents } from '../../agents/agent-runner'
import { ROOT_AGENT_NAME } from '../../api/callbacks'
import { transcribe } from '../../api/chatbot-api'
import './chat-bot.scss'

interface ChatBotMessage {
  role: CHATBOT_ROLE
  message: string
  audio?: Blob
  type: SUPPORTED_MESSAGE_TYPE
  id: string
  includeInContextHistory: boolean
  includeInChatPanel: boolean
}

interface Props {
  nodes: AssetTree
  onToggleNodes: (node: TreeNodeData[]) => void
}

export const ChatMessagePanel = ({ nodes, onToggleNodes }: Props) => {
  /** Hooks */
  const {
    audioUrl: recordedVoiceUrl,
    audioBlob: recordedVoiceBlob,
    recordingStatus,
    isPermissionDenied,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecorder()

  /** States and Refs */
  const [text, setText] = useState('')
  const [chatContent, setChatContent] = useState<undefined | ChatBotMessage[]>(undefined)
  const chatContentRef = useRef(null)
  const textInputRef = useRef(null)

  const addMessageToChatContent = useCallback(
    (text: string, role: CHATBOT_ROLE, includeInContextHistory: boolean, includeInChatPanel: boolean) => {
      if (text) {
        setChatContent((prev) => {
          return [
            ...(prev || []),
            {
              id: uniqueId('text_message_'),
              message: text,
              role: role,
              includeInContextHistory: includeInContextHistory,
              includeInChatPanel: includeInChatPanel,
              type: SUPPORTED_MESSAGE_TYPE.TEXT,
            },
          ]
        })
      }
      setText('')
    },
    []
  )
  const addVoiceToChatContent = useCallback((audio: Blob) => {
    if (audio) {
      setChatContent((prev) => {
        return [
          ...(prev || []),
          {
            id: uniqueId('audio_message_'),
            message: '',
            audio: audio,
            role: CHATBOT_ROLE.USER,
            includeInContextHistory: true,
            includeInChatPanel: true,
            type: SUPPORTED_MESSAGE_TYPE.AUDIO,
          },
          {
            id: uniqueId('text_message_'),
            message: 'Trying to convert the voice to text...',
            role: CHATBOT_ROLE.ASSISTANT,
            includeInContextHistory: false,
            includeInChatPanel: true,
            type: SUPPORTED_MESSAGE_TYPE.TEXT,
          },
        ]
      })
    }
  }, [])

  const addChatChunkReceived = useCallback((text: string) => {
    if (!text) {
      return
    }

    setChatContent((prev) => {
      if (prev) {
        const lastMessage = last(prev)!
        if (lastMessage.role === CHATBOT_ROLE.ASSISTANT) {
          lastMessage.message = lastMessage.message + text
          return [...prev.slice(0, prev.length - 1), lastMessage]
        } else {
          return [
            ...prev,
            {
              id: uniqueId('text_message'),
              role: CHATBOT_ROLE.ASSISTANT,
              message: text,
              includeInContextHistory: true,
              includeInChatPanel: true,
              type: SUPPORTED_MESSAGE_TYPE.TEXT,
            } as ChatBotMessage,
          ]
        }
      } else {
        return prev
      }
    })
  }, [])

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
        },
      ]
      return chatHistory
        .filter(({ includeInContextHistory }) => includeInContextHistory)
        .map(({ message, role }) => ({
          role: role.toString(),
          content: message,
        }))
    },
    [chatContent]
  )

  const generate = useCallback(
    async (messages: BotMessage[]) => {
      const abortSignal = new AbortController().signal

      runAgents(messages, {
        abortSignal,
        context: {
          assetTree: nodes,
          toggleAssetNodes: onToggleNodes,
        },
        callbacks: {
          onSuccess: (eventData) => console.log(eventData),
          onDelta: (eventData) => {
            const { message, agent } = eventData
            if (agent === ROOT_AGENT_NAME) {
              addChatChunkReceived(message)
            }
          },
          onError: (eventData) => console.log(eventData),
          onWorking: (eventData) => console.log(eventData),
        },
      })
    },
    [addChatChunkReceived, nodes, onToggleNodes]
  )

  const handleNewUserMessage = useCallback(async () => {
    addMessageToChatContent(text, CHATBOT_ROLE.USER, true, true)
    const content = await generate(getBotMessages(text, CHATBOT_ROLE.USER))
    console.log('Final generate result ::: ', content)
  }, [addMessageToChatContent, generate, getBotMessages, text])

  const handleNewUserVoiceMessage = useCallback(
    async (voice: Blob) => {
      addVoiceToChatContent(voice)
      const transcription = await transcribe(voice)
      addMessageToChatContent(transcription, CHATBOT_ROLE.USER, true, true)
      const content = await generate(getBotMessages(transcription, CHATBOT_ROLE.USER))
      console.log('Final generate result ::: ', content)
    },
    [addMessageToChatContent, addVoiceToChatContent, generate, getBotMessages]
  )

  /** Callbacks */

  //
  const initializeChatContext = useCallback(() => {
    setChatContent(undefined)
    addMessageToChatContent(`How can I help you?`, CHATBOT_ROLE.ASSISTANT, false, true)
  }, [addMessageToChatContent])
  //
  useEffect(() => {
    if (chatContent === undefined) {
      initializeChatContext()
    }
  }, [chatContent, initializeChatContext])
  //
  useEffect(() => {
    if (chatContentRef && chatContentRef.current) {
      // @ts-ignore
      chatContentRef.current.scrollTo(0, chatContentRef.current.scrollHeight * 100)
    }
  }, [chatContent])
  //

  useEffect(() => {
    if (textInputRef && textInputRef.current) {
      // @ts-ignore
      textInputRef.current.focus()
    }
  }, [textInputRef, chatContent])

  /** Renderer */
  return (
    <div className={classNames('ChartBot')}>
      {
        <div className="ChartBot-header">
          <span className="ChartBot-header-text">Talk to New Oil Management</span>
          <div className="ChartBot-header-actions">
            <Button
              title="Clear"
              displayTitle={false}
              imageSource={TrashBin}
              imageSize={16}
              onClick={initializeChatContext}
            />
          </div>
        </div>
      }
      <div className={classNames('ChartBot-chatPanel')} ref={chatContentRef}>
        {chatContent &&
          chatContent
            .filter(({ includeInChatPanel }) => includeInChatPanel)
            .map(({ message, type, audio, id, role }) => (
              <div
                key={id}
                className={classNames('ChartBot-chatPanel-messageContainer', {
                  user: role === CHATBOT_ROLE.USER,
                  assistant: role === CHATBOT_ROLE.ASSISTANT,
                })}
              >
                <div
                  className={classNames('ChartBot-chatPanel-messageContainer-avatar', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                  })}
                  title={role === CHATBOT_ROLE.ASSISTANT ? 'Bot' : 'You'}
                >
                  {role === CHATBOT_ROLE.ASSISTANT ? (
                    <img className="ChartBot-chatPanel-messageContainer-avatar-image" src={AssistantAvatar} alt="Bot" />
                  ) : (
                    <img className="ChartBot-chatPanel-messageContainer-avatar-image" src={UserAvatar} alt="User" />
                  )}
                </div>
                <div
                  className={classNames('ChartBot-chatPanel-messageContainer-message', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                    audio: type === SUPPORTED_MESSAGE_TYPE.AUDIO,
                  })}
                >
                  {type === SUPPORTED_MESSAGE_TYPE.AUDIO && audio ? (
                    <audio
                      className="ChartBot-chatPanel-messageContainer-message-messageVoice"
                      src={URL.createObjectURL(audio)}
                      controls
                      controlsList="nodownload"
                    />
                  ) : (
                    <Fragment>
                      <Markdown
                        className={classNames('ChartBot-chatPanel-messageContainer-message-messageText', {
                          user: role === CHATBOT_ROLE.USER,
                          assistant: role === CHATBOT_ROLE.ASSISTANT,
                        })}
                      >
                        {message}
                      </Markdown>
                    </Fragment>
                  )}
                </div>
              </div>
            ))}
      </div>

      <div className="ChartBot-inputContainer">
        {recordedVoiceUrl ? (
          <audio
            className="ChartBot-inputContainer-voicePlaceHolder"
            src={recordedVoiceUrl}
            controls
            controlsList="nodownload"
          />
        ) : (
          <Input
            label="Search"
            placeholder="Search"
            value={text}
            title="wildcard supported"
            onChange={(e) => {
              const value = e.currentTarget.value
              setText(value)
            }}
            onKeyDown={(event) => {
              if (!event.shiftKey && event.key === 'Enter') {
                event.preventDefault()
                handleNewUserMessage()
              }
            }}
            style={{
              marginBottom: '8px',
            }}
            className={classNames('searchInput')}
          />
        )}
        {!recordedVoiceUrl && (
          <Button
            className="ChartBot-inputContainer-buttonContainer record"
            title={isPermissionDenied ? 'Permission Denied' : recordingStatus === 'inactive' ? 'Record' : 'Stop'}
            displayTitle={false}
            disabled={isPermissionDenied}
            imageSource={recordingStatus === 'inactive' ? RecordIcon : StopIcon}
            imageSize={16}
            onClick={() => {
              recordingStatus === 'inactive' ? startRecording() : stopRecording()
            }}
          />
        )}
        {recordedVoiceUrl && (
          <Button
            className="ChartBot-inputContainer-buttonContainer send"
            title={'Send'}
            displayTitle={false}
            imageSource={SendMessage}
            imageSize={16}
            onClick={() => {
              if (recordedVoiceBlob) {
                handleNewUserVoiceMessage(recordedVoiceBlob)
                resetRecording()
              }
            }}
          />
        )}
        <Button
          className="ChartBot-inputContainer-buttonContainer reset"
          title={'Reset'}
          displayTitle={false}
          imageSource={TrashBin}
          imageSize={16}
          onClick={resetRecording}
        />
      </div>
    </div>
  )
}
