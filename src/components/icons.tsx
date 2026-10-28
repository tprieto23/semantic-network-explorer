import { useId } from "react";

/** Íconos del diseño, en SVG en línea para heredar el color del texto. */

/** Logo del proyecto (public/favicon.svg): tres nodos girados 45°, con fondo transparente. */
export function LogoIcon({ size = 38 }: { size?: number }) {
  // Ids únicos: el logo puede aparecer dos veces en la página (riel y barra de celular).
  // useId trae caracteres como «» o «:» que algunos navegadores no aceptan en url(#…).
  const id = `logo${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const main = `${id}-principal`;
  const second = `${id}-secundaria`;
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={main} x1="106" y1="222" x2="184" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6BC8CC" />
          <stop offset="1" stopColor="#8BCB2E" />
        </linearGradient>
        <linearGradient id={second} x1="184" y1="80" x2="220" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8BCB2E" />
          <stop offset="1" stopColor="#858DCC" />
        </linearGradient>
      </defs>
      <g transform="rotate(45 160 160)">
        <g strokeWidth="9" strokeLinecap="round">
          <path d="M106 222 184 80" stroke={`url(#${main})`} />
          <path d="M184 80 220 180" stroke={`url(#${second})`} />
        </g>
        <circle cx="106" cy="222" r="48" fill="#6BC8CC" />
        <circle cx="184" cy="80" r="36" fill="#8BCB2E" />
        <circle cx="220" cy="180" r="22" fill="#858DCC" />
      </g>
    </svg>
  );
}

export function SummaryIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="10" y="2" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="2" y="10" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="10" y="10" width="6" height="6" rx="2" fill="currentColor" />
    </svg>
  );
}

export function NetworkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="4.5" y1="5" x2="13" y2="4" />
      <line x1="4.5" y1="5" x2="9" y2="13.5" />
      <line x1="13" y1="4" x2="9" y2="13.5" />
      <circle cx="4.5" cy="5" r="2.4" fill="currentColor" />
      <circle cx="13" cy="4" r="1.8" fill="currentColor" />
      <circle cx="9" cy="13.5" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function EvolutionIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 18 18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2,13 6.5,8.5 10,11 16,4.5" />
      <polyline points="12,4.5 16,4.5 16,8.5" />
    </svg>
  );
}

export function TableIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="5" x2="15" y2="5" />
      <line x1="3" y1="9" x2="15" y2="9" />
      <line x1="3" y1="13" x2="11" y2="13" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.6" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}

export function ThemeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 2.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
    </svg>
  );
}

export function ChevronIcon({ direction = "left" }: { direction?: "left" | "right" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      style={{ transform: direction === "right" ? "rotate(180deg)" : undefined }}
    >
      <polyline points="7.5,2.5 4,6 7.5,9.5" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2.5" y1="7" x2="11" y2="7" />
      <polyline points="7.5,3.5 11,7 7.5,10.5" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6 6 2.5 10 6V10H2Z" />
    </svg>
  );
}

export function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" />
      <line x1="6.5" y1="11.5" x2="9.5" y2="11.5" />
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.8 7a4.2 4.2 0 1 0 1.3-3.05" />
      <polyline points="2.6,1.9 2.6,4.6 5.3,4.6" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
      <circle cx="4" cy="9" r="1.6" />
      <circle cx="9" cy="9" r="1.6" />
      <circle cx="14" cy="9" r="1.6" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" />
      <path d="M1.9 8h12.2M8 1.7c1.8 1.7 2.7 3.8 2.7 6.3S9.8 12.6 8 14.3M8 1.7C6.2 3.4 5.3 5.5 5.3 8s.9 4.6 2.7 6.3" />
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 1.5h4v4M5.5 12.5h-4v-4M12.5 1.5 8 6M1.5 12.5 6 8" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 1.8v7.4M4 6.4 7 9.4l3-3M2 11.8h10" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6.6 9.4a2.8 2.8 0 0 0 4 0l2.2-2.2a2.8 2.8 0 0 0-4-4l-.9.9M9.4 6.6a2.8 2.8 0 0 0-4 0L3.2 8.8a2.8 2.8 0 0 0 4 4l.9-.9" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3.6C6.6 2.6 4.6 2.3 2.3 2.6v9.8c2.3-.3 4.3 0 5.7 1 1.4-1 3.4-1.3 5.7-1V2.6c-2.3-.3-4.3 0-5.7 1Zm0 0v9.8" />
    </svg>
  );
}
