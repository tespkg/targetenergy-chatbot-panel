import React, { useMemo, useState } from "react";
import MinimizeIcon from "../../img/icons/chevron-down.svg";
import { Button } from "../button/Button";
import { useSelector } from "react-redux";
import { getInfoPanelTraces } from "../../store/queries";
import { Trace } from "../trace/Trace";
import { LlmTrace } from "../../core/orchestration/llm-callbacks";
import { TraceDetails } from "./trace-details/TraceDetails";
import { DollarIcon } from "../icons/DollarIcon";
import classNames from "classnames";
import { InfoPanelUtils } from "./infoPanelUtils";
import "./info-panel.scss";

interface Props {
  onClose: () => void;
}
export const InfoPanel = ({ onClose }: Props) => {
  /** states */
  const [traceInDetailsSection, setTraceInDetailsSection] = useState<LlmTrace | undefined>(undefined);
  const [showTokens, setShowTokens] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [showTimes, setShowTimes] = useState(true);
  /** Selectors */
  const traces = useSelector(getInfoPanelTraces);

  /** Memos */
  const totalPrice = useMemo(() => {
    let total = 0;
    traces.forEach((trace) => {
      total += trace.aggregatedTokenUsage.totalPrice;
    });
    return total.toFixed(3);
  }, [traces]);
  //
  const totalTokenConsumption = useMemo(() => {
    let total = 0;
    traces.forEach((trace) => {
      total += trace.aggregatedTokenUsage.totalTokens;
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
        <Button
          title={showPrices ? "Hide Prices" : "Show Prices"}
          primary={!showPrices}
          onClick={() => {
            setShowPrices((prev) => !prev);
          }}
        />
        <Button
          title={showTokens ? "Hide Tokens" : "Show Tokens"}
          primary={!showTokens}
          onClick={() => {
            setShowTokens((prev) => !prev);
          }}
        />
        <Button
          title={showTimes ? "Hide Times" : "Show Times"}
          primary={!showTimes}
          onClick={() => {
            setShowTimes((prev) => !prev);
          }}
        />
        <div
          className={classNames("infoPanel-header-totalPrice", InfoPanelUtils.getPriceOrder(parseFloat(totalPrice)))}
        >
          <span className="infoPanel-header-totalPrice-price">{`Total Price: ${totalPrice}`}</span>
          <DollarIcon
            color={
              InfoPanelUtils.getPriceOrder(parseFloat(totalPrice)) === "low"
                ? "#50bb50"
                : InfoPanelUtils.getPriceOrder(parseFloat(totalPrice)) === "normal"
                ? "#FFC61B"
                : "#ff0000"
            }
          />
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
              showPrices={showPrices}
              showTokens={showTokens}
              showTimes={showTimes}
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
