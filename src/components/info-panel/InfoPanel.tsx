import React from "react";
import MinimizeIcon from "../../img/icons/chevron-down.svg";
import { Button } from "../button/Button";
import "./info-panel.scss";

interface Props {
  onClose: () => void;
}
export const InfoPanel = ({ onClose }: Props) => {
  return (
    <div className="infoPanel">
      <div className="infoPanel-header">
        <Button title="Minimize" displayTitle={false} imageSource={MinimizeIcon} imageSize={32} onClick={onClose} />
      </div>
      <div className="infoPanel-body"></div>
    </div>
  );
};
