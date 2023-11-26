import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import TrashBin from 'img/icons/trashbin.svg'
import RecordIcon from 'img/icons/record.svg'
import StopIcon from 'img/icons/stop-circle.svg'
import LoadingIcon from 'img/icons/animated-loading.svg'
import SendMessage from 'img/icons/send-message.svg'

import UserAvatar from 'img/icons/user_avatar.svg'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import { CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from 'commons/enums/Chatbot'
import { Input } from '@grafana/ui'
import { Button } from 'components/button/Button'
import Markdown from 'markdown-to-jsx'
import { last, uniqueId } from 'lodash'
import { BotMessage } from '../../agents/bot-types'
import { AssetTree } from '../../commons/types/asset-tree'
import { TreeNodeData } from '../../commons/types/TreeNodeData'
import { useVoiceRecorder } from 'hooks/use-voice-recorder/useVoiceRecorder'
import { runAgents } from '../../agents/agent-runner'
import { transcribe } from '../../api/chatbot-api'
import { Dashboard } from '../../commons/types/dashboard-manager'
import { getTemplateSrv } from '@grafana/runtime'
import MinimizeIcon from 'img/icons/chevron-down.svg'
import PlayIcon from 'img/icons/play-icon.svg'
import './chat-bot.scss'
import {
  DeltaEventData,
  ErrorEventData,
  ROOT_AGENT_NAME,
  SuccessEventData,
  WorkingEventData,
} from '../../agents/callbacks'

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
  dashboard: Dashboard
  onToggleVisibility: () => void
}

export const ChatMessagePanel = ({ nodes, onToggleNodes, dashboard, onToggleVisibility }: Props) => {
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
  const [chatbotStatus, setChatbotStatus] = useState<string | null>(null)
  const [isChatbotBusy, setChatbotBusy] = useState(false)

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

  const updateChatbotStatus = (eventData: SuccessEventData | DeltaEventData | ErrorEventData | WorkingEventData) => {
    const { type, message } = eventData
    // let agentTitle = agent
    // switch (agent) {
    //   case 'root':
    //     agentTitle = 'Chatbot'
    //     break
    //   case 'root.asset_tree':
    //     agentTitle = 'Chatbot Asset-Tree'
    //     break
    //   case 'root.panel_manager':
    //     agentTitle = 'Chatbot Panel-Manager'
    //     break
    //
    //   default:
    //     break
    // }
    switch (type) {
      case 'success':
      case 'error':
        setChatbotBusy(false)
        setChatbotStatus(null)
        break
      case 'working':
        setChatbotBusy(true)
        setChatbotStatus(message)
        break
      case 'delta':
        setChatbotBusy(true)
        setChatbotStatus(message)
        break
    }
  }
  const generate = useCallback(
    (messages: BotMessage[]) => {
      const abortSignal = new AbortController().signal

      return runAgents(messages, {
        abortSignal,
        context: {
          assetTree: nodes,
          toggleAssetNodes: onToggleNodes,
          dashboard: dashboard,
        },
        callbacks: {
          onSuccess: (eventData: SuccessEventData) => {
            console.log(eventData)
            updateChatbotStatus(eventData)
          },
          onDelta: (eventData: DeltaEventData) => {
            const { message, agent } = eventData
            if (agent === ROOT_AGENT_NAME) {
              addChatChunkReceived(message)
            }
            // updateChatbotStatus(eventData)
          },
          onError: (eventData: ErrorEventData) => {
            console.log(eventData)
            updateChatbotStatus(eventData)
          },
          onWorking: (eventData: WorkingEventData) => {
            console.log(eventData)
            updateChatbotStatus(eventData)
          },
        },
      })
    },
    [addChatChunkReceived, dashboard, nodes, onToggleNodes]
  )

  const handleNewUserMessage = useCallback(async () => {
    if (text.startsWith('/')) {
      // then it is a command and we are testing
      const command = text.substring(1)
      switch (command) {
        case 'toggle_row': {
          const rowName = 'BOE Production-Equity Share'
          // Select rows by a unique attribute or structure, here we use the row's title text
          const rows = Array.from(document.querySelectorAll('.dashboard-row'))
          console.log('Queries rows :::', rows)

          // @ts-ignore
          const targetRow = rows.find((row) => row.innerText.includes(rowName))
          if (targetRow) {
            // targetRow.click()
            // Find the toggle button or element in the row and click it
            const toggleButton = targetRow.querySelector('.dashboard-row__title') as HTMLButtonElement // Adjust this selector based on the actual structure
            toggleButton.click()
          }
          break
        }
        case 'json_model': {
          console.log('Parsed dashboard:', dashboard)
          const panel = dashboard.findPanel('Change in Proven Oil Reserves')
          console.log('Parsed panel:', panel)
          const data = await panel?.csvData()
          console.log('Parsed data:', data)
          break
        }
        case 'global_variables': {
          const variables = getTemplateSrv().getVariables()
          console.log(variables)
          break
        }
        case 'dashboard_markdown': {
          console.log('Dashboard Markdown\n', dashboard.toMarkdown(2))
          break
        }
      }

      return
    }

    addMessageToChatContent(text, CHATBOT_ROLE.USER, true, true)
    const content = await generate(getBotMessages(text, CHATBOT_ROLE.USER))
    console.log('Final generate result ::: ', content)
  }, [addMessageToChatContent, dashboard, generate, getBotMessages, text])

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
    <div className={classNames('ChatBot')}>
      <div className="ChatBot-header">
        <span className="ChatBot-header-text">Talk to Portfolio Management</span>
        <div className="ChatBot-header-actions">
          <Button
            title="Clear"
            displayTitle={false}
            imageSource={TrashBin}
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
      <div className={classNames('ChatBot-chatPanel')} ref={chatContentRef}>
        {chatContent &&
          chatContent
            .filter(({ includeInChatPanel }) => includeInChatPanel)
            .map(({ message, type, audio, id, role }) => (
              <div
                key={id}
                className={classNames('ChatBot-chatPanel-messageContainer', {
                  user: role === CHATBOT_ROLE.USER,
                  assistant: role === CHATBOT_ROLE.ASSISTANT,
                })}
              >
                <div
                  className={classNames('ChatBot-chatPanel-messageContainer-avatar', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                  })}
                  title={role === CHATBOT_ROLE.ASSISTANT ? 'Bot' : 'You'}
                >
                  {role === CHATBOT_ROLE.ASSISTANT ? (
                    <img className="ChatBot-chatPanel-messageContainer-avatar-image" src={AssistantAvatar} alt="Bot" />
                  ) : (
                    <img className="ChatBot-chatPanel-messageContainer-avatar-image" src={UserAvatar} alt="User" />
                  )}
                </div>
                <div
                  className={classNames('ChatBot-chatPanel-messageContainer-message', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                    audio: type === SUPPORTED_MESSAGE_TYPE.AUDIO,
                  })}
                >
                  {type === SUPPORTED_MESSAGE_TYPE.AUDIO && audio ? (
                    <audio
                      className="ChatBot-chatPanel-messageContainer-message-messageVoice"
                      src={URL.createObjectURL(audio)}
                      controls
                      controlsList="nodownload"
                    />
                  ) : (
                    <Fragment>
                      <Markdown
                        className={classNames('ChatBot-chatPanel-messageContainer-message-messageText', {
                          user: role === CHATBOT_ROLE.USER,
                          assistant: role === CHATBOT_ROLE.ASSISTANT,
                        })}
                      >
                        {message}
                      </Markdown>
                      {role === CHATBOT_ROLE.ASSISTANT && (
                        <div className={'ChatBot-chatPanel-messageContainer-message-actionsContainer'}>
                          <Button
                            className={'ChatBot-chatPanel-messageContainer-message-actionsContainer-playButton'}
                            title={'Play'}
                            displayTitle={false}
                            frame={false}
                            imageSource={PlayIcon}
                            onClick={() => {
                              console.log('Text to speech player')
                            }}
                          />
                        </div>
                      )}
                    </Fragment>
                  )}
                </div>
              </div>
            ))}
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
            className={classNames('searchInput')}
            label="Search"
            placeholder="Search"
            value={text}
            title="wildcard supported"
            onChange={(e) => {
              const value = e.currentTarget.value
              setText(value)
            }}
            loading={isChatbotBusy}
            onKeyDown={(event) => {
              if (!event.shiftKey && event.key === 'Enter' && !isChatbotBusy) {
                event.preventDefault()
                handleNewUserMessage()
              }
            }}
            style={{
              marginBottom: '8px',
            }}
            autoFocus
          />
        )}
        {!recordedVoiceUrl && (
          <Button
            className="ChatBot-inputContainer-buttonContainer record"
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
            className="ChatBot-inputContainer-buttonContainer send"
            title={'Send'}
            displayTitle={false}
            imageSource={SendMessage}
            imageSize={16}
            onClick={() => {
              if (recordedVoiceBlob && !isChatbotBusy) {
                handleNewUserVoiceMessage(recordedVoiceBlob)
                resetRecording()
              }
            }}
          />
        )}
        {recordedVoiceUrl && (
          <Button
            className="ChatBot-inputContainer-buttonContainer reset"
            title={'Reset'}
            displayTitle={false}
            imageSource={TrashBin}
            imageSize={16}
            onClick={resetRecording}
          />
        )}
      </div>
    </div>
  )
}
