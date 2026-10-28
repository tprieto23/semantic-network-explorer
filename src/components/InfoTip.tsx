import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const GAP = 6;

/**
 * Botón «i» con un tooltip de vidrio. Se abre al pasar el cursor, con el foco del teclado
 * o con un toque; Escape o un clic fuera lo cierran. Va en un portal con posición fija
 * para que el scroll de los paneles no lo recorte.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  // Fijado con clic o toque, o abierto con el teclado.
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const open = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    const outside = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) setPinned(false);
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

  // Debajo del botón y dentro de la ventana; arriba si no cabe.
  const place = useCallback(() => {
    if (!buttonRef.current || !popRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const pop = popRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left - 8, 8), window.innerWidth - pop.width - 8);
    const below = rect.bottom + GAP + pop.height <= window.innerHeight - 8;
    setPosition({ left, top: below ? rect.bottom + GAP : rect.top - GAP - pop.height });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Si el panel se desplaza con el tooltip abierto, lo acompaña.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <span className="info-tip">
      <button
        ref={buttonRef}
        type="button"
        className={`info-btn${open ? " open" : ""}`}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={pinned}
        onClick={() => setPinned(!pinned)}
        onPointerEnter={(event) => event.pointerType !== "touch" && setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && setPinned(true)}
        onBlur={() => setPinned(false)}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
        </svg>
      </button>
      {open &&
        createPortal(
          <span
            ref={popRef}
            id={id}
            role="tooltip"
            className="info-pop glass"
            style={position ?? { left: -9999, top: 0 }}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
