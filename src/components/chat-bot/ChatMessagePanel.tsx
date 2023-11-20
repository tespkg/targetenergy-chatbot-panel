import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import TrashBin from 'img/icons/trashbin.svg'
import RecordIcon from 'img/icons/record.svg'
import StopIcon from 'img/icons/stop-circle.svg'
import SendMessage from 'img/icons/send-message.svg'

import UserAvatar from 'img/icons/user_avatar.svg'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import { CHATBOT_FUNCTIONS, CHATBOT_ROLE, SUPPORTED_MESSAGE_TYPE } from 'commons/enums/Chatbot'
import { createSystemMessage } from 'api/chatbot/system-message'
import { Input } from '@grafana/ui'
import { Button } from 'components/button/Button'
import Markdown from 'markdown-to-jsx'
import { Global, css } from '@emotion/react'
import { last, uniqueId } from 'lodash'
import { BotGenerateRequest, BotGenerateResponse } from '../../commons/types/bot-types'
import { BotFunctionExecutionContext } from '../../commons/types/chatbot-types'
import { AssetNodes } from '../../commons/utils/asset-nodes'
import { createChatBotFunctionDefinitions } from '../../commons/utils/chatbot-function-utils'
import { TreeNodeData } from '../../commons/types/TreeNodeData'
import { useVoiceRecorder } from 'hooks/use-voice-recorder/useVoiceRecorder'

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
  nodes: AssetNodes
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
              // TODO not a good key
              id: text,
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

  const handleBotResponse = useCallback(
    async (botResponse: BotGenerateResponse) => {
      console.log('Handling bot response', botResponse)

      if (botResponse.text) {
        setChatContent((prev) => {
          if (prev) {
            const lastMessage = last(prev)!
            if (lastMessage.role === CHATBOT_ROLE.ASSISTANT) {
              lastMessage.message = lastMessage.message + botResponse.text
              return [...prev.slice(0, prev.length - 1), lastMessage]
            } else {
              return [
                ...prev,
                {
                  id: uniqueId('text_message'),
                  role: CHATBOT_ROLE.ASSISTANT,
                  message: botResponse.text,
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
      } else if (botResponse.audio_transcription) {
        setChatContent((prev) => {
          if (prev) {
            return [
              ...prev,
              {
                id: uniqueId('text_message'),
                role: CHATBOT_ROLE.USER,
                message: botResponse.audio_transcription,
                includeInContextHistory: true,
                includeInChatPanel: true,
                type: SUPPORTED_MESSAGE_TYPE.TEXT,
              } as ChatBotMessage,
            ]
          } else {
            return prev
          }
        })
      } else if (botResponse.function_call) {
        setChatContent((prev) => {
          return [
            ...(prev ?? []),
            {
              id: uniqueId('text_message'),
              role: CHATBOT_ROLE.ASSISTANT,
              message: JSON.stringify(botResponse),
              includeInContextHistory: true,
              includeInChatPanel: false,
              type: SUPPORTED_MESSAGE_TYPE.TEXT,
            } as ChatBotMessage,
          ]
        })

        // @ts-ignore
        const commandContext: BotFunctionExecutionContext = {
          addIntent(intent: string) {
            addMessageToChatContent(intent, CHATBOT_ROLE.ASSISTANT, false, true)
          },
        }

        const functionCall = botResponse.function_call || {}
        const name = functionCall.name
        const args = functionCall.arguments || {}
        console.log('Executing function', name, args)

        if (name) {
          switch (name) {
            case CHATBOT_FUNCTIONS.TOGGLE_ASSET_NODE_SELECTION: {
              const { node_ids } = args
              const nodeIds = node_ids as string[]

              const toggleNodes = []
              for (const nodeId of nodeIds) {
                const node = nodes.findNodeById(nodeId)
                if (node) {
                  toggleNodes.push(node)
                }
              }
              if (toggleNodes.length > 0) {
                onToggleNodes(toggleNodes)
              }
            }
          }
        }
      }
    },
    [addMessageToChatContent, nodes, onToggleNodes]
  )

  const requestChatbotCompletion = useCallback(
    async (message: string | Blob, role: CHATBOT_ROLE = CHATBOT_ROLE.USER, isAudio: boolean) => {
      const prompt = message

      const systemMessage = createSystemMessage(nodes)

      const newContent = [
        {
          id: uniqueId(),
          message: systemMessage,
          role: CHATBOT_ROLE.ASSISTANT,
          includeInContextHistory: true,
          includeInChatPanel: false,
          type: SUPPORTED_MESSAGE_TYPE.TEXT,
        } as ChatBotMessage,
        ...(chatContent || []),
      ]
      if (!isAudio) {
        newContent.push({
          id: uniqueId(),
          message: prompt as string,
          role: role,
          includeInContextHistory: true,
          includeInChatPanel: false,
          type: SUPPORTED_MESSAGE_TYPE.TEXT,
        })
      }
      const messages = newContent
        .filter(({ includeInContextHistory }) => includeInContextHistory)
        .map(({ message, role }) => ({
          role: role.toString(),
          content: message,
        }))
      const request: BotGenerateRequest = {
        messages: messages,
        functions: createChatBotFunctionDefinitions({}),
      }
      let options: RequestInit = {
        method: 'POST',
      }
      if (isAudio) {
        const formData = new FormData()
        formData.append('audio', message as Blob, 'voice_recording.webm')
        formData.append('request', JSON.stringify(request))
        options.body = formData
      } else {
        options.body = JSON.stringify(request)
        options.headers = {
          'Content-Type': 'application/json',
        }
      }

      // const url = `https://dso.dev.meeraspace.com/chatbot-api/v1/generate`
      const url = `http://localhost:8000/api/v1/generate`

      try {
        const response = await fetch(url, options)
        if (!response.ok) {
          console.log('Request to the generate endpoint failed')
          return
        }
        const reader = response.body!.getReader()
        const decoder = new TextDecoder('utf-8')
        let messages = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          // parse data chunks to BotResponses
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n\n')
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const messageText = line.replace('data: ', '').trim()
              if (messageText !== '') {
                const message = JSON.parse(messageText) as BotGenerateResponse
                await handleBotResponse(message)
                messages.push(message)
              }
            }
          }
        }

        const textMessages = messages.map((m) => m.text).join('')
        console.log('Generate Response :::', messages, textMessages)
        // addMessageToChatContent(messageContent, CHATBOT_ROLE.ASSISTANT, true, true)
      } catch (err) {}
    },
    [chatContent, handleBotResponse, nodes]
  )

  const handleNewUserMessage = useCallback(async () => {
    addMessageToChatContent(text, CHATBOT_ROLE.USER, true, true)
    await requestChatbotCompletion(text, CHATBOT_ROLE.USER, false)
  }, [addMessageToChatContent, requestChatbotCompletion, text])
  //
  const handleNewUserVoiceMessage = useCallback(
    async (voice: Blob) => {
      addVoiceToChatContent(voice)
      await requestChatbotCompletion(voice, CHATBOT_ROLE.USER, true)
    },
    [addVoiceToChatContent, requestChatbotCompletion]
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
