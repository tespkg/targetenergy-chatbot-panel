import React, { useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import TrashBin from 'img/icons/trashbin.svg'
import UserAvatar from 'img/icons/user_avatar.svg'
import AssistantAvatar from 'img/icons/assisstant_avatar.svg'
import { CHATBOT_ROLE } from 'commons/enums/Chatbot'
import { BOT_SYSTEM_MESSAGE } from 'api/chatbot/system-message'
import { Input } from '@grafana/ui'
import { Button } from 'components/button/Button'

import './dso-chat-bot.scss'

interface ChatBotMessage {
  role: CHATBOT_ROLE
  message: string
  id: string
  includeInContextHistory: boolean
  includeInChatPanel: boolean
}

export const DsoChatBot = () => {
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

  const handleNewUserMessage = useCallback(async () => {
    addMessageToChatContent(text, CHATBOT_ROLE.USER, true, true)

    const newContent = [
      ...(chatContent || []),
      {
        message: text,
        role: CHATBOT_ROLE.USER,
        includeInContextHistory: true,
      },
    ]
    const messages = newContent
      .filter(({ includeInContextHistory }) => includeInContextHistory)
      .map(({ message, role }) => ({
        role: role,
        content: message,
      }))

    console.log('messages: ', messages)

    const url = `https://dso.dev.meeraspace.com/chatbot-api/v1/generate`

    let options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: messages, functions: [] }),
    }

    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        console.log('Request to the generate endpoint failed')
        return
      }
      const reader = response.body!.getReader()
      const decoder = new TextDecoder('utf-8')
      let resultText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        // Massage and parse the chunk of data
        const chunk = decoder.decode(value)
        const lines = chunk.split('\\n')
        const parsedLines = lines
          .map((line) => line.replace(/^data: /, '').trim()) // Remove the "data: " prefix
          .filter((line) => line !== '' && line !== '[DONE]') // Remove empty lines and "[DONE]"
          .map((line) => JSON.parse(line)) // Parse the JSON string

        for (const parsedLine of parsedLines) {
          const { choices } = parsedLine
          const { delta } = choices[0]
          const { content } = delta
          // Update the UI with the new content
          if (content) {
            resultText += content
          }
        }
      }

      console.log('Generate response:', resultText)
    } catch (err) {}
  }, [addMessageToChatContent, chatContent, text])

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
    <div className={classNames('dsoChartBot')}>
      {
        <div className="dsoChartBot-header">
          <span className="dsoChartBot-header-text">Talk to New Oil Management</span>
          <div className="dsoChartBot-header-actions">
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
      <div className={classNames('dsoChartBot-chatPanel')} ref={chatContentRef}>
        {chatContent &&
          chatContent
            .filter(({ includeInChatPanel }) => includeInChatPanel)
            .map(({ message, id, role }) => (
              <div
                key={id}
                className={classNames('dsoChartBot-chatPanel-messageContainer', {
                  user: role === CHATBOT_ROLE.USER,
                  assistant: role === CHATBOT_ROLE.ASSISTANT,
                })}
              >
                <div
                  className={classNames('dsoChartBot-chatPanel-messageContainer-avatar', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                  })}
                  title={role === CHATBOT_ROLE.ASSISTANT ? 'DSO bot' : 'You'}
                >
                  {role === CHATBOT_ROLE.ASSISTANT ? (
                    <img
                      className="dsoChartBot-chatPanel-messageContainer-avatar-image"
                      // @ts-ignore
                      src={AssistantAvatar}
                      alt="Bot"
                    />
                  ) : (
                    <img
                      className="dsoChartBot-chatPanel-messageContainer-avatar-image"
                      // @ts-ignore
                      src={UserAvatar}
                      alt="User"
                    />
                  )}
                </div>
                <div
                  className={classNames('dsoChartBot-chatPanel-messageContainer-message', {
                    user: role === CHATBOT_ROLE.USER,
                    assistant: role === CHATBOT_ROLE.ASSISTANT,
                  })}
                >
                  <span
                    className={classNames('dsoChartBot-chatPanel-messageContainer-message-messageText', {
                      user: role === CHATBOT_ROLE.USER,
                      assistant: role === CHATBOT_ROLE.ASSISTANT,
                    })}
                    dangerouslySetInnerHTML={{ __html: message }}
                  ></span>
                </div>
              </div>
            ))}
      </div>

      <div className="dsoChartBot-inputContainer">
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
      </div>
    </div>
  )
}
