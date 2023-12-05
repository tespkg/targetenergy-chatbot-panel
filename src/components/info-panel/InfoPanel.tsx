import React from "react";
import MinimizeIcon from "../../img/icons/chevron-down.svg";
import { Button } from "../button/Button";
import "./info-panel.scss";
import { useSelector } from "react-redux";
import { getInfoPanelTraces } from "../../store/queries";
import { Trace } from "../trace/Trace";

interface Props {
  onClose: () => void;
}
export const InfoPanel = ({ onClose }: Props) => {
  /** Selectors */
  const traces = useSelector(getInfoPanelTraces);

  /** Renderer */
  return (
    <div className="infoPanel">
      <div className="infoPanel-header">
        <Button title="Minimize" displayTitle={false} imageSource={MinimizeIcon} imageSize={32} onClick={onClose} />
      </div>
      <div className="infoPanel-body">
        {traces.map((trace) => {
          return <Trace key={trace.id} trace={trace} />;
        })}
      </div>
    </div>
  );
};
