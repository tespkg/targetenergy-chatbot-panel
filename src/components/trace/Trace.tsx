import React, { useMemo, useState } from "react";
import classNames from "classnames";
import "./trace.scss";
import { LlmTrace } from "../../core/orchestration/llm-callbacks";
import { ClockIcon } from "../icons/ClockIcon";
import { DollarIcon } from "../icons/DollarIcon";
import { ToolIcon } from "../icons/ToolIcon";
import { AgentIcon } from "../icons/AgentIcon";

interface Props {
  trace: LlmTrace;
}
export const Trace = ({ trace }: Props) => {
  /** Extract properties */
  const { startTime, endTime, name, promptTokens, completionTokens, totalPrice, type, subTraces } = trace;

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
        return <AgentIcon />;
      case "tool":
        return <ToolIcon />;
      default:
        return type;
    }
  }, [type]);
  /** Renderer */
  return (
    <div className={classNames("trace")}>
      <div
        className="trace-header"
        onClick={() => {
          setCollapsed((prev) => !prev);
        }}
      >
        <div className="trace-header-type">{typeIcon}</div>
        <div className="trace-header-name">{name}</div>
        <div className="trace-header-duration">
          <ClockIcon />
          <span className="trace-header-duration-text">{`${durationSeconds.toFixed(2)} (s)`}</span>
        </div>
        <div className="trace-header-tokens">{`${promptTokens} -> ${completionTokens} Tokens`}</div>
        <div className="trace-header-cost">
          <DollarIcon color={"rgba(150, 205,150, 1)"} />
          <span className="trace-header-cost-text">{` ${totalPrice.toFixed(3)}$`}</span>
        </div>
      </div>
      {subTraces.length > 0 && !isCollapsed && (
        <div className="trace-body">
          <div className="trace-body-subTracesContainer">
            {subTraces.map((subTrace) => (
              <div className="trace-body-subTracesContainer-subTrace" key={subTrace.id}>
                <div className="trace-body-subTracesContainer-subTrace-bodyHeaderConnector"></div>
                <Trace trace={subTrace} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
