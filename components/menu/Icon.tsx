import type { ReactNode } from "react";

// One consistent set of outline icons (24px grid, 1.8 stroke). Direction-sensitive icons
// (arrow, chevron) point toward the "end" of the line and are mirrored by CSS in right-to-left.
const paths: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 11.5a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 6 19.5L5 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  back: <path d="M20 12H5M11 6l-6 6 6 6" />,
  order: (
    <>
      <path d="M9 4.5h6a1 1 0 0 1 1 1V6h1.5A1.5 1.5 0 0 1 19 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-11A1.5 1.5 0 0 1 6.5 6H8v-.5a1 1 0 0 1 1-1z" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  home: <path d="M4 11l8-6.5 8 6.5M6 10v9h12v-9" />,
  chart: <path d="M5 19v-8M12 19V5M19 19v-6" />,
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M18 19a5 5 0 0 0-2.5-4.3" />
    </>
  ),
  logout: <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10M15 8l4 4-4 4M19 12H9" />,
  printer: (
    <>
      <path d="M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  edit: <path d="M5 19l1-4L16.5 4.5a2 2 0 0 1 3 3L9 18l-4 1z" />,
  external: <path d="M8 16l8-8M9 8h7v7" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  trash: (
    <>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
      <path d="M10.5 11v5M13.5 11v5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5" />
      <path d="M5 15v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-3" />
    </>
  ),
  table: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <path d="M13.5 13.5h3v3h-3zM18 18h2v2h-2z" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18v3" />
      <path d="M4 8.5V17a2 2 0 0 0 2 2h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 6.5" />
      <circle cx="15.5" cy="13.5" r="1" />
    </>
  ),
  bank: (
    <>
      <path d="M3.5 9.5L12 4.5l8.5 5M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3.5 19.5h17" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 4h12v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 20V4z" />
      <path d="M9 9h6M9 13h4" />
    </>
  ),
  cone: (
    <>
      <path d="M8 11h8l-4 10-4-10z" />
      <path d="M7.5 11a4.5 4.5 0 1 1 9 0" />
    </>
  )
};

export default function Icon({ name, size = 22, className }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`fd-icon ${className ?? ""}`}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
