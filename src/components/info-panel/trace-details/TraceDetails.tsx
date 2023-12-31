import React, { useMemo } from "react";
import { LlmTrace } from "../../../core/orchestration/llm-callbacks";
import { CHATBOT_ROLE } from "../../../commons/enums/Chatbot";
import { hashString } from "../../../commons/utils/string-utils";
import Markdown from "markdown-to-jsx";
import { Button } from "../../button/Button";
import { CopyIcon } from "../../icons/CopyIcon";
import { format } from "date-fns";
import { uniqueId } from "lodash";
import "./trace-details.scss";

interface Props {
  trace: LlmTrace;
}
export const TraceDetails = ({ trace }: Props) => {
  /** Extract Properties */
  const { inputs, outputs, type, startTime, endTime, aggregatedTokenUsage, tokenUsage, subTraces } = trace;

  /** Memos */
  const messageInputItems: Array<{ title: string; content: string }> = useMemo(() => {
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

  const toolInputItems: Array<{ title: string; content: string }> = useMemo(() => {
    if (inputs) {
      const { functions } = inputs;
      return (functions || []).map((functionItem: any) => {
        const { name, description } = functionItem;
        return { title: name, content: description };
      });
    } else {
      return [];
    }
  }, [inputs]);

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
  //
  const traceInfoDetails = useMemo(() => {
    return [
      {
        title: "Type:",
        description: type,
        key: uniqueId("traceInfoDetails-"),
      },
      {
        title: "Start time:",
        description: format(startTime, "yyyy MMM dd, HH:mm:ss"),
        key: uniqueId("traceInfoDetails-"),
      },
      { title: "End time:", description: format(endTime, "yyyy MMM dd, HH:mm:ss"), key: uniqueId("traceInfoDetails-") },
      {
        title: "Elapsed time:",
        description: `${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2)} (s)`,
        key: uniqueId("traceInfoDetails-"),
      },
      {
        title: "Token Usage:",
        description: `${tokenUsage.promptTokens} → ${tokenUsage.completionTokens} Tokens`,
        key: uniqueId("traceInfoDetails-"),
      },
      {
        title: "Total Token Usage:",
        description: `${aggregatedTokenUsage.promptTokens} → ${aggregatedTokenUsage.completionTokens} Tokens`,
        key: uniqueId("traceInfoDetails-"),
      },
      {
        title: "Price:",
        description: `${aggregatedTokenUsage.totalPrice.toFixed(3)} $`,
        key: uniqueId("traceInfoDetails-"),
      },
      {
        title: "Number of sub traces:",
        description: subTraces.length ? subTraces.length : "None",
        key: uniqueId("traceInfoDetails-"),
      },
    ];
  }, [type, subTraces, startTime, endTime, tokenUsage, aggregatedTokenUsage]);

  /** Renderer */
  return (
    <div className="traceDetails">
      <div className="traceDetails-leftContainer">
        {messageInputItems.length > 0 && (
          <div className="traceDetails-inputs">
            <div className="traceDetails-inputs-header">
              <span className="traceDetails-inputs-header-text">Messages</span>
            </div>
            <div className="traceDetails-inputs-body">
              <table className="markdown-html traceDetails-table">
                <thead>
                  <tr>
                    <th className={"traceDetails-tableCell"}>#</th>
                    <th className={"traceDetails-tableCell"}>Title</th>
                    <th className={"traceDetails-tableCell"}>Content</th>
                  </tr>
                </thead>
                <tbody>
                  {messageInputItems.map(({ content, title }, index) => (
                    <tr key={hashString(content)}>
                      <td className={"traceDetails-tableCell"}>{index + 1}</td>
                      <td className={"traceDetails-tableCell"}>{title}</td>
                      <td className={"traceDetails-tableCell"}>
                        <div className={"traceDetails-inputs-body-content"}>
                          <Markdown className="markdown-html">{content}</Markdown>
                          <Button
                            title="Copy Content"
                            displayTitle={false}
                            frame={false}
                            icon={<CopyIcon width={32} height={32} />}
                            imageSize={16}
                            onClick={() => {
                              navigator.clipboard.writeText(content);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {toolInputItems.length > 0 && (
          <div className="traceDetails-inputs">
            <div className="traceDetails-inputs-header">
              <span className="traceDetails-inputs-header-text">Tools</span>
            </div>
            <div className="traceDetails-inputs-body">
              <table className="markdown-html traceDetails-table">
                <thead>
                  <tr>
                    <th className={"traceDetails-tableCell"}>#</th>
                    <th className={"traceDetails-tableCell"}>Name</th>
                    <th className={"traceDetails-tableCell"}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {toolInputItems.map(({ content, title }, index) => (
                    <tr key={hashString(content)}>
                      <td className={"traceDetails-tableCell"}>{index + 1}</td>
                      <td className={"traceDetails-tableCell"}>{title}</td>
                      <td className={"traceDetails-tableCell"}>
                        <div className={"traceDetails-inputs-body-content"}>
                          <Markdown className="markdown-html">{content}</Markdown>
                          <Button
                            title="Copy Content"
                            displayTitle={false}
                            frame={false}
                            icon={<CopyIcon width={32} height={32} />}
                            imageSize={16}
                            onClick={() => {
                              navigator.clipboard.writeText(content);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="traceDetails-outputs">
          <div className="traceDetails-outputs-header">
            <span className="traceDetails-inputs-header-text">Outputs</span>
          </div>
          <div className="traceDetails-outputs-body">
            <table className="markdown-html traceDetails-table">
              <thead>
                <tr>
                  <th className={"traceDetails-tableCell"}>Title</th>
                  <th className={"traceDetails-tableCell"}>Content</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={"traceDetails-tableCell"}>{outputItem.title}</td>
                  <td className={"traceDetails-tableCell"}>
                    <div className={"traceDetails-outputs-body-content"}>
                      <Markdown className="markdown-html">{outputItem.content}</Markdown>
                      <Button
                        title="Copy Content"
                        displayTitle={false}
                        frame={false}
                        icon={<CopyIcon width={32} height={32} />}
                        imageSize={16}
                        onClick={() => {
                          navigator.clipboard.writeText(outputItem.content);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="traceDetails-rightContainer">
        {traceInfoDetails.map(({ title, description, key }) => (
          <div className={"traceDetails-rightContainer-infoSection"} key={key}>
            <div className={"traceDetails-rightContainer-infoSection-title"}>{title}</div>
            <div className={"traceDetails-rightContainer-infoSection-description"}>{description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
