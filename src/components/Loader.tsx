import { useId } from "react";
import type { CSSProperties } from "react";
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
 * Geometría del logo girado 45° en una caja de 320: centro y radio de cada nodo, y origen,
 * largo y ángulo de cada link (calculados una vez a partir de logo-red-giro-45.svg).
 */
const NODES = [
  { x: 77.98, y: 165.66, r: 48, color: "#6BC8CC" },
  { x: 233.54, y: 120.4, r: 36, color: "#8BCB2E" },
  { x: 188.28, y: 216.57, r: 22, color: "#858DCC" },
];
const LINKS = [
  { x: 77.98, y: 165.66, length: 162.01, angle: -16.22, color: "#8BCB2E" },
  { x: 233.54, y: 120.4, length: 106.28, angle: 115.2, color: "#858DCC" },
];

/**
 * El logo animado: los nodos laten en secuencia y un pulso recorre cada link (ciclo de
 * 2,4 s). Los nodos y los pulsos son elementos HTML animados solo con transform y opacity:
 * así la animación la mueve el compositor del navegador y no se congela mientras la app
 * calcula la red en el hilo principal. Las líneas son un SVG estático.
 */
export function Loader({ size = 64, label, inline = false, className }: LoaderProps) {
  const { t } = useT();
  const id = `loader${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const scale = size / 320;
  const px = (value: number) => `${value * scale}px`;
  return (
    <span
      className={`loader${inline ? " inline" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="loader-mark" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 320 320" fill="none">
          <defs>
            <linearGradient id={`${id}-a`} x1="106" y1="222" x2="184" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6BC8CC" />
              <stop offset="1" stopColor="#8BCB2E" />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="184" y1="80" x2="220" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8BCB2E" />
              <stop offset="1" stopColor="#858DCC" />
            </linearGradient>
          </defs>
          <g transform="rotate(45 160 160)" strokeWidth="9" strokeLinecap="round">
            <path d="M106 222 184 80" stroke={`url(#${id}-a)`} />
            <path d="M184 80 220 180" stroke={`url(#${id}-b)`} />
          </g>
        </svg>
        {LINKS.map((link, index) => (
          <span
            key={index}
            className="loader-track"
            style={{ left: px(link.x), top: px(link.y), width: px(link.length), transform: `rotate(${link.angle}deg)` }}
          >
            <span className={`loader-run r${index + 1}`}>
              <span
                className="loader-spark"
                style={{ "--spark": link.color, width: px(30), height: px(30) } as CSSProperties}
              />
            </span>
          </span>
        ))}
        {NODES.map((node, index) => (
          <span
            key={index}
            className={`loader-dot d${index + 1}`}
            style={{
              left: px(node.x - node.r),
              top: px(node.y - node.r),
              width: px(node.r * 2),
              height: px(node.r * 2),
              background: node.color,
            }}
          />
        ))}
      </span>
      {label ? <span className="loader-label">{label}</span> : <span className="visually-hidden">{t("common.loading")}</span>}
    </span>
  );
}
