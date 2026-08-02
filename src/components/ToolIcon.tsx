import type { ReactNode } from 'react';

interface ToolIconProps {
  name:
    | 'arrow'
    | 'check'
    | 'chevron'
    | 'close'
    | 'compass'
    | 'database'
    | 'file'
    | 'key'
    | 'layers'
    | 'map'
    | 'plus'
    | 'search'
    | 'settings'
    | 'spark'
    | 'table'
    | 'target'
    | 'transform'
    | 'upload';
  size?: number;
}

export function ToolIcon({ name, size = 18 }: ToolIconProps) {
  const paths = {
    arrow: <path d="m5 12 14 0m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
      </>
    ),
    file: <path d="M6 2h8l4 4v16H6V2Zm8 0v5h5M9 12h6M9 16h6" />,
    key: (
      <>
        <circle cx="8.5" cy="15.5" r="3.5" />
        <path d="m11 13 8-8m-3 3 2 2m-5 1 2 2" />
      </>
    ),
    layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-7 9 7 4 7-4M5 16l7 4 7-4" />,
    map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    spark: (
      <path d="m12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2Zm7 14 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" />
    ),
    table: <path d="M3 4h18v16H3V4Zm0 5h18M8 4v16" />,
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      </>
    ),
    transform: <path d="M4 7h13l-3-3m3 13H4l3 3M17 7l-3 3M4 17l3-3" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7" />,
  } satisfies Record<ToolIconProps['name'], ReactNode>;

  return (
    <svg
      aria-hidden="true"
      className="tool-icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        {paths[name]}
      </g>
    </svg>
  );
}
