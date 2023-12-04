import React from "react";
import classNames from "classnames";
import "./button.scss";

interface ButtonProps {
  className?: string;
  title: string;
  primary?: boolean;
  imageSource?: string;
  icon?: React.ReactNode;
  imageSize?: number;
  displayTitle?: boolean;
  frame?: boolean;
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  disabled?: boolean;
}

export const Button = ({
  className,
  title,
  primary = false,
  imageSource,
  icon,
  imageSize = 18,
  displayTitle = true,
  frame = true,
  onClick,
  disabled = false,
}: ButtonProps) => {
  /** Renderer */
  return (
    <div className="buttonWrapper">
      <button
        className={classNames(
          className,
          "buttonWrapper-button",
          frame ? (primary ? "primary" : "secondary") : "noframe",
          { icon: !displayTitle },
          { disabled: disabled },
          { titleLayout: displayTitle && !imageSource },
          { imageLayout: !displayTitle && imageSource },
          { titleAndImageLayout: displayTitle && imageSource }
        )}
        title={title}
        onClick={onClick}
        disabled={disabled}
      >
        {displayTitle ? <span>{title}</span> : <></>}
        {imageSource ? (
          <div className="buttonWrapper-button-imageContainer">
            <img src={imageSource} width={imageSize} height={imageSize} />
          </div>
        ) : (
          <></>
        )}
        {icon}
      </button>
    </div>
  );
};
