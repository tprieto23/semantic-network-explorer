import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Botón «i» con un tooltip de vidrio. Se abre al pasar el cursor o con el foco del
 * teclado, y con un toque en pantallas táctiles; Escape o un clic fuera lo cierran.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  // Fijado con clic o toque; el hover y el foco lo muestran por CSS.
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!pinned) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPinned(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [pinned]);

  return (
    <span ref={ref} className={`info-tip${pinned ? " pinned" : ""}`}>
      <button
        type="button"
        className="info-btn"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={pinned}
        onClick={() => setPinned(!pinned)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setPinned(false);
            event.currentTarget.blur();
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
        </svg>
      </button>
      <span id={id} role="tooltip" className="info-pop glass">
        {children}
      </span>
    </span>
  );
}
