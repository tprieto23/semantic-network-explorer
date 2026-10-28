import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/** Espacio mínimo bajo el botón para abrir hacia abajo; si no, se abre hacia arriba. */
const MIN_BELOW = 220;
const MAX_HEIGHT = 340;
const GAP = 6;

/**
 * Desplegable anclado a un botón, para dibujar en un portal con posición fija: así el
 * scroll del panel de filtros no lo recorta. Se recoloca al desplazar o redimensionar y
 * se cierra con un clic fuera del botón y del desplegable.
 */
export function useAnchoredPopup<T extends HTMLElement, P extends HTMLElement>() {
  const triggerRef = useRef<T>(null);
  const popupRef = useRef<P>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>();

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - GAP - 12;
    const above = rect.top - GAP - 12;
    const downward = below >= MIN_BELOW || below >= above;
    setStyle({
      left: rect.left,
      // Al menos tan ancho como el botón; crece con su contenido sin salir de la ventana.
      minWidth: rect.width,
      maxWidth: window.innerWidth - rect.left - 12,
      maxHeight: Math.min(MAX_HEIGHT, downward ? below : above),
      ...(downward ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
    });
  }, []);

  const show = useCallback(() => {
    place();
    setOpen(true);
  }, [place]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    // Con el desplegable abierto se recoloca si se desplaza el panel, no su propio contenido.
    const scrolled = (event: Event) => {
      if (!popupRef.current?.contains(event.target as Node)) place();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", scrolled, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scrolled, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return { triggerRef, popupRef, open, setOpen, show, style };
}
