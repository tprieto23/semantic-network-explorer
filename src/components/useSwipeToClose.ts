import { useRef } from "react";
import type { PointerEvent } from "react";

/** Distancia hacia abajo que cierra la hoja. */
const CLOSE_DISTANCE = 80;
const MOBILE = "(max-width: 640px)";
/** El gesto empieza en la cabecera de la hoja, no en su contenido (que tiene scroll). */
const HANDLE = ".panel-head, .details-head";

/**
 * En celular, los paneles son hojas que suben desde abajo: arrastrar su cabecera hacia
 * abajo las acompaña con el dedo y, pasado un umbral, las cierra. Los manejadores pueden
 * ir en un ancestro de la hoja: los eventos llegan por propagación.
 */
export function useSwipeToClose(onClose: () => void) {
  const start = useRef<{ y: number; sheet: HTMLElement } | null>(null);

  function sheetOf(event: PointerEvent<HTMLElement>) {
    const target = event.target as Element;
    return target.closest(HANDLE) ? target.closest<HTMLElement>("aside") : null;
  }

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      const sheet = sheetOf(event);
      if (event.pointerType !== "touch" || !sheet || !window.matchMedia(MOBILE).matches) return;
      // Los botones de la cabecera siguen funcionando con un toque.
      if ((event.target as Element).closest("button")) return;
      start.current = { y: event.clientY, sheet };
      sheet.style.transition = "none";
      (event.target as Element).setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!start.current) return;
      const distance = Math.max(0, event.clientY - start.current.y);
      start.current.sheet.style.transform = `translateY(${distance}px)`;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (!start.current) return;
      const { sheet, y } = start.current;
      start.current = null;
      sheet.style.transition = "";
      sheet.style.transform = "";
      if (event.clientY - y > CLOSE_DISTANCE) onClose();
    },
    onPointerCancel() {
      if (!start.current) return;
      start.current.sheet.style.transition = "";
      start.current.sheet.style.transform = "";
      start.current = null;
    },
  };
}
