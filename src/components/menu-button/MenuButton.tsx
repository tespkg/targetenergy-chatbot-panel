import React, { ReactNode, useState } from "react";
import classNames from "classnames";

import "./menu-button.scss";

interface MenuButtonProps {
  // Mandatory
  items: ReactNode[];
  // not mandatory
  className?: string;
  listClassName?: string;
  children?: ReactNode;
}
export const MenuButton = ({
  items,
  //
  className,
  listClassName,
  children,
}: MenuButtonProps) => {
  /** States */
  const [isListOpen, setListOpen] = useState(false);

  /** Renderer */
  return (
    <div className={classNames("menuButton", className)}>
      <div
        className={"menuButton-children"}
        onClick={() => {
          setListOpen((prev) => !prev);
        }}
      >
        {children}
      </div>
      {isListOpen && (
        <div
          className={classNames("menuButton-list", listClassName)}
          onMouseLeave={() => {
            setListOpen(false);
          }}
        >
          {items.map((item) => item)}
        </div>
      )}
    </div>
  );
};
