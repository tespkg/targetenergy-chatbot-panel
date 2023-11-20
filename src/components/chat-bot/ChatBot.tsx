import React, { useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import TrashBin from 'img/icons/trashbin.svg'
import UserAvatar from 'img/icons/user_avatar.svg'
import StopIcon from 'img/icons/stop-circle.svg'
import RecordIcon from 'img/icons/record.svg'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import SendMessage from 'img/icons/send-message.svg'
import { CHATBOT_FUNCTIONS, CHATBOT_ROLE } from 'commons/enums/Chatbot'
import { BOT_SYSTEM_MESSAGE } from 'api/chatbot/system-message'
import { Input } from '@grafana/ui'
import { Button } from 'components/button/Button'
import { last, uniqueId } from 'lodash'
import { BotGenerateRequest, BotGenerateResponse } from '../../commons/types/bot-types'
import { BotFunctionExecutionContext } from '../../commons/types/chatbot-types'
import { useVoiceRecorder } from 'hooks/use-voice-recorder/useVoiceRecorder'

import './chat-bot.scss'

interface ChatBotMessage {
  role: CHATBOT_ROLE
  message: string
  id: string
  includeInContextHistory: boolean
  includeInChatPanel: boolean
}

export const ChatBot = () => {
  /** Hooks */
  const {
    audioUrl: recordedVoiceUrl,
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
            },
          ]
        })
      }
      setText('')
    },
    []
  )

  const handleBotResponse = useCallback(
    (botResponse: BotGenerateResponse) => {
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
                  id: uniqueId(),
                  role: CHATBOT_ROLE.ASSISTANT,
                  message: botResponse.text,
                  includeInContextHistory: true,
                  includeInChatPanel: true,
                } as ChatBotMessage,
              ]
            }
          } else {
            return prev
          }
        })
      } else if (botResponse.function_call) {
        setChatContent((prev) => {
          return [
            ...(prev ?? []),
            {
              id: uniqueId(),
              role: CHATBOT_ROLE.ASSISTANT,
              message: JSON.stringify(botResponse),
              includeInContextHistory: true,
              includeInChatPanel: false,
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
            case CHATBOT_FUNCTIONS.GET_USER_NAME: {
              addMessageToChatContent("I'm Hossein", CHATBOT_ROLE.ASSISTANT, false, true)
              break
            }
          }
        }
      }
    },
    [addMessageToChatContent]
  )

  const requestChatbotCompletion = useCallback(
    async (text: string, role: CHATBOT_ROLE = CHATBOT_ROLE.USER) => {
      const newContent = [
        ...(chatContent || []),
        {
          message: text,
          role: role,
          includeInContextHistory: true,
        },
      ]
      const messages = newContent
        .filter(({ includeInContextHistory }) => includeInContextHistory)
        .map(({ message, role }) => ({
          role: role.toString(),
          content: message,
        }))

      const request: BotGenerateRequest = {
        messages: messages,
        functions: [
          {
            name: CHATBOT_FUNCTIONS.GET_USER_NAME,
            description: 'Get user name',
            parameters: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      }
      console.log('messages: ', messages)

      // const url = `https://dso.dev.meeraspace.com/chatbot-api/v1/generate`
      const url = `http://localhost:8000/api/v1/generate`

      let options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }

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
                handleBotResponse(message)
                messages.push(message)
              }
            }
          }
        }

        const messageContent = messages.map((m) => m.text).join('')
        console.log('Generate Response :::', messageContent)
        // addMessageToChatContent(messageContent, CHATBOT_ROLE.ASSISTANT, true, true)
      } catch (err) {}
    },
    [chatContent, handleBotResponse]
  )

  const handleNewUserMessage = useCallback(async () => {
    addMessageToChatContent(text, CHATBOT_ROLE.USER, true, true)
    await requestChatbotCompletion(text)
  }, [addMessageToChatContent, requestChatbotCompletion, text])

  /** Callbacks */

  //
  const initializeChatContext = useCallback(() => {
    setChatContent(undefined)
    addMessageToChatContent(BOT_SYSTEM_MESSAGE, CHATBOT_ROLE.SYSTEM, true, false)
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
              // @ts-ignore
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
            .map(({ message, id, role }) => (
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
                    <img
                      className="ChartBot-chatPanel-messageContainer-avatar-image"
                      // @ts-ignore
                      src={AssistantAvatar}
                      alt="Bot"
                    />
                  ) : (
                    <img
                      className="ChartBot-chatPanel-messageContainer-avatar-image"
                      // @ts-ignore
                      src={UserAvatar}
                      alt="User"
                    />
                  )}
                </div>
                <div
                  className={classNames('ChartBot-chatPanel-messageContainer-message', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                  })}
                >
                  <span
                    className={classNames('ChartBot-chatPanel-messageContainer-message-messageText', {
                      user: role === CHATBOT_ROLE.USER,
                      assistant: role === CHATBOT_ROLE.ASSISTANT,
                    })}
                    dangerouslySetInnerHTML={{ __html: message }}
                  ></span>
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
            // @ts-ignore
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
            // @ts-ignore
            imageSource={SendMessage}
            imageSize={16}
            onClick={() => {
              // send message here
            }}
          />
        )}
        <Button
          className="ChartBot-inputContainer-buttonContainer reset"
          title={'Reset'}
          displayTitle={false}
          // @ts-ignore
          imageSource={TrashBin}
          imageSize={16}
          onClick={resetRecording}
        />
      </div>
    </div>
  )
}
