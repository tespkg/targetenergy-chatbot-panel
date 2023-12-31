import React from "react";

interface Props {
  width?: number;
  height?: number;
  color?: string;
}

export function ClockIcon({ width = 20, height = 20, color = "#FFC61B" }: Props) {
  return (
    <svg
      fill={color}
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 20 20"
      enableBackground="new 0 0 20 20"
    >
      <path
        d="M10,20C4.5,20,0,15.5,0,10S4.5,0,10,0s10,4.5,10,10S15.5,20,10,20z M10,2c-4.4,0-8,3.6-8,8s3.6,8,8,8s8-3.6,8-8S14.4,2,10,2
	z"
      />
      <path
        d="M13.8,12l-4-1C9.3,10.9,9,10.5,9,10V5c0-0.6,0.4-1,1-1s1,0.4,1,1v4.2l3.2,0.8c0.5,0.1,0.9,0.7,0.7,1.2
	C14.8,11.8,14.3,12.1,13.8,12z"
      />
    </svg>
  );
}
