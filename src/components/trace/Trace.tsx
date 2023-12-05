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
}
export const Trace = ({ trace }: Props) => {
  /** Extract properties */
  const { startTime, endTime, name, promptTokens, completionTokens, totalTokens, totalPrice, type, subTraces } = trace;

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
  //
  const totalCumulativeCost = useMemo(() => {
    let totalCost = totalPrice;
    subTraces.forEach(({ totalPrice: _totalCost }) => {
      totalCost += _totalCost;
    });

    return totalCost;
  }, [totalPrice, subTraces]);
  //
  const totalCumulativeTokenConsumption = useMemo(() => {
    let _totalTokens = totalTokens;
    subTraces.forEach(({ totalTokens: subTraceTotalTokens }) => {
      _totalTokens += subTraceTotalTokens;
    });

    return _totalTokens;
  }, [totalPrice, subTraces]);

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
        <div className="trace-header-tokens">{`${totalCumulativeTokenConsumption} Total Tokens`}</div>
        <div className="trace-header-cost">
          <span className="trace-header-cost-text">{`Price ${totalPrice.toFixed(3)}`}</span>
          <DollarIcon color={"rgba(150, 205,150, 1)"} />
        </div>
        <div className="trace-header-cost">
          <span className="trace-header-cost-text">{`Total Trace Price ${totalCumulativeCost.toFixed(3)}`}</span>
          <DollarIcon color={"rgba(150, 205,150, 1)"} />
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
