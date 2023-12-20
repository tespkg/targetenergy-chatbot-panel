import React from "react";

interface Props {
  width?: number;
  height?: number;
  color?: string;
}

export function ChevronDoubleRight({ width = 24, height = 24, color = "#1979ff" }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="-2.4 -2.4 28.80 28.80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      transform="matrix(1, 0, 0, 1, 0, 0)rotate(0)"
    >
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke={color} strokeWidth="0.048"></g>
      <g id="SVGRepo_iconCarrier">
        {" "}
        <path
          d="M6 17L11 12L6 7M13 17L18 12L13 7"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </g>
    </svg>
  );
}
