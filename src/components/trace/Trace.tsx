import React, { Fragment, useMemo, useState } from "react";
import classNames from "classnames";
import "./trace.scss";
import { LlmTrace } from "../../core/orchestration/llm-callbacks";
import { ClockIcon } from "../icons/ClockIcon";
import { DollarIcon } from "../icons/DollarIcon";
import { ToolIcon } from "../icons/ToolIcon";
import { AgentIcon } from "../icons/AgentIcon";
import { InfoPanelUtils } from "../info-panel/infoPanelUtils";
import { ChevronDoubleRight } from "../icons/ChevronDoubleRight";
import { ChevronDoubleBottom } from "../icons/ChevronDoubleBottom";

interface Props {
  trace: LlmTrace;
  selectedTraceId: string;
  onTraceClick: (trace: LlmTrace) => void;
  showPrices: boolean;
  showTokens: boolean;
  showTimes: boolean;
}
export const Trace = ({ trace, onTraceClick, selectedTraceId, showTokens, showTimes, showPrices }: Props) => {
  /** Extract properties */
  const { id, startTime, endTime, name, tokenUsage, aggregatedTokenUsage, type, subTraces } = trace;

  /** States */
  const [isCollapsed, setCollapsed] = useState(true);

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
            {subTraces.length > 0 && (isCollapsed ? <ChevronDoubleRight /> : <ChevronDoubleBottom />)}
            <AgentIcon />
            <span className="trace-header-type-text">Agent</span>
          </Fragment>
        );
      case "tool":
        return (
          <Fragment>
            {subTraces.length > 0 && (isCollapsed ? <ChevronDoubleRight /> : <ChevronDoubleBottom />)}
            <ToolIcon width={18} height={18} />
            <span className="trace-header-type-text">Tool</span>
          </Fragment>
        );
      default:
        return type;
    }
  }, [type, subTraces, isCollapsed]);

  /** Renderer */
  return (
    <div className={classNames("trace")}>
      <div className={classNames("trace-header", { selected: selectedTraceId === id })}>
        <div
          className="trace-header-type"
          onClick={() => {
            setCollapsed((prev) => !prev);
          }}
        >
          {typeIcon}
        </div>
        <div
          className={classNames("trace-header-name")}
          onClick={() => {
            onTraceClick(trace);
          }}
        >
          {name}
        </div>
        {showTimes && (
          <div className={classNames("trace-header-duration", InfoPanelUtils.getDurationOrder(durationSeconds))}>
            <ClockIcon
              color={
                InfoPanelUtils.getDurationOrder(durationSeconds) === "low"
                  ? "#50bb50"
                  : InfoPanelUtils.getDurationOrder(durationSeconds) === "normal"
                  ? "#FFC61B"
                  : "#ff0000"
              }
            />
            <span className="trace-header-duration-text">{`${durationSeconds.toFixed(2)} (s)`}</span>
          </div>
        )}
        {/*<div className="trace-header-tokens">{`${tokenUsage.promptTokens} → ${tokenUsage.completionTokens} Tokens`}</div>*/}
        {showTokens && (aggregatedTokenUsage.promptTokens > 0 || aggregatedTokenUsage.completionTokens > 0) && (
          <div className="trace-header-tokens">{`${aggregatedTokenUsage.promptTokens} → ${aggregatedTokenUsage.completionTokens} Tokens`}</div>
        )}
        {showPrices && (
          <div className={classNames("trace-header-cost", InfoPanelUtils.getPriceOrder(tokenUsage.totalPrice))}>
            <span className="trace-header-cost-text">{`Price ${tokenUsage.totalPrice.toFixed(3)}`}</span>
            <DollarIcon
              color={
                InfoPanelUtils.getPriceOrder(tokenUsage.totalPrice) === "low"
                  ? "#50bb50"
                  : InfoPanelUtils.getPriceOrder(tokenUsage.totalPrice) === "normal"
                  ? "#FFC61B"
                  : "#ff0000"
              }
              width={18}
              height={18}
            />
          </div>
        )}
      </div>
      {subTraces.length > 0 && (
        <div className={classNames("trace-body", { collapsed: isCollapsed })}>
          <div className="trace-body-subTracesContainer">
            {subTraces.map((subTrace) => (
              <div className="trace-body-subTracesContainer-subTrace" key={subTrace.id}>
                <div className="trace-body-subTracesContainer-subTrace-bodyHeaderConnector"></div>
                <Trace
                  trace={subTrace}
                  onTraceClick={onTraceClick}
                  selectedTraceId={selectedTraceId}
                  showPrices={showPrices}
                  showTokens={showTokens}
                  showTimes={showTimes}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
