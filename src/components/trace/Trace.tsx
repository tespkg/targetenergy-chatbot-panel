import React, { Fragment, useMemo, useState } from "react";
import classNames from "classnames";
import "./trace.scss";
import { LlmTrace } from "../../core/orchestration/llm-callbacks";
import { ClockIcon } from "../icons/ClockIcon";
import { DollarIcon } from "../icons/DollarIcon";
import { ToolIcon } from "../icons/ToolIcon";
import { AgentIcon } from "../icons/AgentIcon";

interface Props {
  trace: LlmTrace;
  selectedTraceId: string;
  onTraceClick: (trace: LlmTrace) => void;
}
export const Trace = ({ trace, onTraceClick, selectedTraceId }: Props) => {
  /** Extract properties */
  const { id, startTime, endTime, name, tokenUsage, aggregatedTokenUsage, type, subTraces } = trace;

  /** States */
  const [isCollapsed, setCollapsed] = useState(false);
  /** Memos */
  const durationSeconds = useMemo(() => {
    const startTimeMillis = new Date(startTime).getTime();
    const endTimeMillis = new Date(endTime).getTime();
    const duration = endTimeMillis - startTimeMillis;
    return duration / 1000;
  }, [startTime, endTime]);
  //
  const typeIcon = useMemo(() => {
    switch (type) {
      case "agent":
        return (
          <Fragment>
            <AgentIcon />
            <div className="trace-header-type-text">Agent</div>
          </Fragment>
        );
      case "tool":
        return (
          <Fragment>
            <ToolIcon />
            <div className="trace-header-type-text">Tool</div>
          </Fragment>
        );
      default:
        return type;
    }
  }, [type]);

  /** Renderer */
  return (
    <div className={classNames("trace")}>
      <div className="trace-header">
        <div
          className="trace-header-type"
          onClick={() => {
            setCollapsed((prev) => !prev);
          }}
        >
          {typeIcon}
        </div>
        <div
          className={classNames("trace-header-name", { selected: selectedTraceId === id })}
          onClick={() => {
            onTraceClick(trace);
          }}
        >
          {name}
        </div>
        <div className="trace-header-duration">
          <ClockIcon />
          <span className="trace-header-duration-text">{`${durationSeconds.toFixed(2)} (s)`}</span>
        </div>
        <div className="trace-header-tokens">{`${tokenUsage.promptTokens} -> ${tokenUsage.completionTokens} Tokens`}</div>
        <div className="trace-header-tokens">{`${aggregatedTokenUsage.promptTokens} -> ${aggregatedTokenUsage.completionTokens} Tokens`}</div>
        <div className="trace-header-cost">
          <span className="trace-header-cost-text">{`Price ${tokenUsage.totalPrice.toFixed(3)}`}</span>
          <DollarIcon color={"rgba(150, 205,150, 1)"} />
        </div>
      </div>
      {subTraces.length > 0 && !isCollapsed && (
        <div className="trace-body">
          <div className="trace-body-subTracesContainer">
            {subTraces.map((subTrace) => (
              <div className="trace-body-subTracesContainer-subTrace" key={subTrace.id}>
                <div className="trace-body-subTracesContainer-subTrace-bodyHeaderConnector"></div>
                <Trace trace={subTrace} onTraceClick={onTraceClick} selectedTraceId={selectedTraceId} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
