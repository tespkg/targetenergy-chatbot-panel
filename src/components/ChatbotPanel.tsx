import { css, cx } from '@emotion/css'
import { PanelProps } from '@grafana/data'
import { useStyles2 } from '@grafana/ui'
import * as React from 'react'
import { TreeOptions } from 'types'
import { DsoChatBot } from 'components/dso-chat-bot/DsoChatbot'
import './style.css'

// let renderCount = 0

interface Props extends PanelProps<TreeOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Roboto, Helvetica, Arial, sans-serif;
      position: relative;
    `,
  }
}
export const defaultFormatTemplate = `{{~#each .}}{{#if @index}} OR {{/if}}
{{~@key}} in ({{#each .}}{{~#if @index}},{{/if}}{{~id}}{{~/each}})
{{~/each}}`

export const ChatbotPanel: React.FC<Props> = ({ options, data, width, height, replaceVariables }) => {
  const styles = useStyles2(getStyles)

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
          padding: 4px;
        `
      )}
    >
      <DsoChatBot />
    </div>
  )
}
