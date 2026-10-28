import { useId } from "react";
import { useT } from "../i18n";

interface LoaderProps {
  /** Lado en píxeles. */
  size?: number;
  /** Texto visible junto al loader; sin texto, se anuncia como «Cargando». */
  label?: string;
  /** En línea con el texto (fila) en lugar de centrado en columna. */
  inline?: boolean;
  className?: string;
}

/**
 * El logo animado: los tres nodos laten en secuencia y un pulso recorre cada link
 * (ciclo de 2,4 s). Las animaciones viven en index.css (.loader-*) y se apagan con
 * prefers-reduced-motion.
 */
export function Loader({ size = 64, label, inline = false, className }: LoaderProps) {
  const { t } = useT();
  // Ids únicos por instancia: puede haber varios loaders a la vez en la página.
  const id = `loader${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const main = `${id}-principal`;
  const second = `${id}-secundaria`;
  return (
    <span
      className={`loader${inline ? " inline" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
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
          <path className="loader-pulse p1" d="M106 222 184 80" pathLength={100} stroke={`url(#${main})`} />
          <path className="loader-pulse p2" d="M184 80 220 180" pathLength={100} stroke={`url(#${second})`} />
          <circle className="loader-node n1" cx="106" cy="222" r="48" fill="#6BC8CC" />
          <circle className="loader-node n2" cx="184" cy="80" r="36" fill="#8BCB2E" />
          <circle className="loader-node n3" cx="220" cy="180" r="22" fill="#858DCC" />
        </g>
      </svg>
      {label ? <span className="loader-label">{label}</span> : <span className="visually-hidden">{t("common.loading")}</span>}
    </span>
  );
}
