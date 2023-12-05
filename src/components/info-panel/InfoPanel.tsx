import React, { useMemo, useState } from "react";
import MinimizeIcon from "../../img/icons/chevron-down.svg";
import { Button } from "../button/Button";
import { useSelector } from "react-redux";
import { getInfoPanelTraces } from "../../store/queries";
import { Trace } from "../trace/Trace";
import { LlmTrace } from "../../core/orchestration/llm-callbacks";
import { TraceDetails } from "./trace-details/TraceDetails";
import { DollarIcon } from "../icons/DollarIcon";
import "./info-panel.scss";

interface Props {
  onClose: () => void;
}
export const InfoPanel = ({ onClose }: Props) => {
  /** states */
  const [traceInDetailsSection, setTraceInDetailsSection] = useState<LlmTrace | undefined>(undefined);

  /** Selectors */
  const traces = useSelector(getInfoPanelTraces);

  /** Memos */
  const totalPrice = useMemo(() => {
    let total = 0;
    traces.forEach((trace) => {
      total += trace.totalPrice;
    });
    return total.toFixed(3);
  }, [traces]);
  //
  const totalTokenConsumption = useMemo(() => {
    let total = 0;
    traces.forEach((trace) => {
      total += trace.totalTokens;
    });
    return total;
  }, [traces]);

  /** Callbacks */
  const onTraceItemClick = (trace: LlmTrace) => {
    setTraceInDetailsSection(trace);
  };
  /** Renderer */
  return (
    <div className="infoPanel">
      <div className="infoPanel-header">
        <div className="infoPanel-header-totalPrice">
          <span className="infoPanel-header-totalPrice-price">{`Total Price: ${totalPrice}`}</span>
          <DollarIcon color={"rgba(150, 205,150, 1)"} />
        </div>
        <div className="infoPanel-header-totalTokens">
          <span className="infoPanel-header-totalTokens-tokens">{`Total Tokens: ${totalTokenConsumption}`}</span>
        </div>
        <Button title="Minimize" displayTitle={false} imageSource={MinimizeIcon} imageSize={32} onClick={onClose} />
      </div>
      <div className="infoPanel-body">
        {traces.map((trace) => {
          return (
            <Trace
              key={trace.id}
              trace={trace}
              onTraceClick={onTraceItemClick}
              selectedTraceId={traceInDetailsSection ? traceInDetailsSection.id : ""}
            />
          );
        })}
        {traceInDetailsSection && (
          <div className="infoPanel-body-traceDetails">
            <TraceDetails trace={traceInDetailsSection} />
          </div>
        )}
      </div>
    </div>
  );
};
