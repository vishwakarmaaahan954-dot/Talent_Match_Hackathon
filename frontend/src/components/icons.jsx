import React from "react";

const base = { width: 18, height: 18, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const UploadIcon = (p) => (
  <svg {...base} {...p}><path d="M10 13V3.5M6.5 7 10 3.5 13.5 7M3.5 13.5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2" /></svg>
);
export const CheckIcon = (p) => (
  <svg {...base} {...p}><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
);
export const CrossIcon = (p) => (
  <svg {...base} {...p}><path d="m5 5 10 10M15 5 5 15" /></svg>
);
export const FileIcon = (p) => (
  <svg {...base} {...p}><path d="M5 2.5h6.5L15 6v11a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5Z" /><path d="M11 2.5V6.5h4" /></svg>
);
