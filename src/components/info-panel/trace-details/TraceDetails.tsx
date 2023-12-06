import React, { useMemo } from "react";
import "./trace-details.scss";
import { LlmTrace } from "../../../core/orchestration/llm-callbacks";
import { CHATBOT_ROLE } from "../../../commons/enums/Chatbot";
import { hashString } from "../../../commons/utils/string-utils";
import Markdown from "markdown-to-jsx";

interface Props {
  trace: LlmTrace;
}
export const TraceDetails = ({ trace }: Props) => {
  /** Extract Properties */
  const { inputs, outputs, type } = trace;

  /** Memos */
  const inputItems: Array<{ title: string; content: string }> = useMemo(() => {
    if (inputs) {
      if (type === "agent") {
        const { messages } = inputs;
        return (messages || []).map((message: any) => {
          const { role } = message;
          if (role === CHATBOT_ROLE.USER || role === CHATBOT_ROLE.SYSTEM) {
            // Message must have a content, let's return it
            return { title: role === CHATBOT_ROLE.USER ? "User" : "System", content: message.content };
          } else if (role === CHATBOT_ROLE.ASSISTANT) {
            if (message.content) {
              // it is an assistant message
              return { title: "Assistant", content: message.content };
            } else {
              // it is a tool call
              const { tool_calls } = message;
              return {
                title: "Tool Call",
                content: tool_calls.map((toolCall: any) => toolCall.function.name).join(", "),
              };
            }
          } else if (role === "tool") {
            return { title: "Tool", content: message.content };
          } else {
            return { title: "Message", content: message?.content || "" };
          }
        });
      } else if (type === "tool") {
        const { question } = inputs;
        if (question) {
          return [{ title: "Question", content: question }];
        } else {
          return [];
        }
      }
    } else {
      return [];
    }
  }, [inputs, type]);
  //
  const outputItem = useMemo(() => {
    if (type === "agent") {
      const { role } = outputs;
      if (role === CHATBOT_ROLE.USER || role === CHATBOT_ROLE.SYSTEM) {
        // Message must have a content, let's return it
        return { title: role === CHATBOT_ROLE.USER ? "User" : "System", content: outputs.content };
      } else if (role === CHATBOT_ROLE.ASSISTANT) {
        if (outputs.content) {
          // it is an assistant message
          return { title: "Assistant", content: outputs.content };
        } else {
          // it is a tool call
          const { tool_calls } = outputs;
          return {
            title: "Tool Call",
            content: tool_calls.map((toolCall: any) => toolCall.function.name).join(", "),
          };
        }
      } else {
        return { title: "Output", content: outputs.content || "" };
      }
    } else if (type === "tool") {
      if (typeof outputs === "string") {
        return { title: "Tool", content: outputs };
      } else {
        const { role } = outputs;
        if (role) {
          if (role === CHATBOT_ROLE.USER || role === CHATBOT_ROLE.SYSTEM) {
            // Message must have a content, let's return it
            return { title: role === CHATBOT_ROLE.USER ? "User" : "System", content: outputs.content };
          } else if (role === CHATBOT_ROLE.ASSISTANT) {
            if (outputs.content) {
              // it is an assistant message
              return { title: "Assistant", content: outputs.content };
            } else {
              // it is a tool call
              const { tool_calls } = outputs;
              return {
                title: "Tool Call",
                content: tool_calls.map((toolCall: any) => toolCall.function.name).join(", "),
              };
            }
          } else {
            return { title: "Output", content: outputs.content || "" };
          }
        } else {
          // the output is a string
          return { title: "Tool", content: outputs };
        }
      }
    } else {
      return { title: "Output", content: outputs.content || "" };
    }
  }, [outputs, type]);

  /** Renderer */
  return (
    <div className="traceDetails">
      <div className="traceDetails-inputs">
        <div className="traceDetails-inputs-header">
          <span className="traceDetails-inputs-header-text">INPUTS</span>
        </div>
        <div className="traceDetails-inputs-body">
          {inputItems.map(({ content, title }, index) => (
            <div className="traceDetails-inputs-body-inputItem" key={hashString(content)}>
              <div className="traceDetails-inputs-body-inputItem-index">{index + 1}</div>
              <div className="traceDetails-inputs-body-inputItem-title">{title}</div>
              {/*<div className="traceDetails-inputs-body-inputItem-content">{content}</div>*/}
              <Markdown className="traceDetails-inputs-body-inputItem-content">{content}</Markdown>
            </div>
          ))}
        </div>
      </div>
      <div className="traceDetails-outputs">
        <div className="traceDetails-outputs-header">
          <span className="traceDetails-inputs-header-text">OUTPUTS</span>
        </div>
        <div className="traceDetails-outputs-body">
          <div className="traceDetails-outputs-body-outputItem">
            <div className="traceDetails-outputs-body-outputItem-title">{outputItem.title}</div>
            <div className="traceDetails-outputs-body-outputItem-content">{outputItem.content}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
