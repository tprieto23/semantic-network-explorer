import { useLayoutEffect, useRef } from "react";

/**
 * Indicador que se desliza hasta el elemento activo de una barra de navegación. Mide el
 * elemento (o su parte `target`, p. ej. el ícono) y mueve el indicador con transform, que
 * el compositor anima sin trabajo del hilo principal.
 */
export function useSlidingIndicator<C extends HTMLElement>(activeKey: string, target = "[aria-current='page']") {
  const containerRef = useRef<C>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    const place = () => {
      const active = container.querySelector<HTMLElement>(target);
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      const box = container.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      indicator.style.opacity = "1";
      indicator.style.width = `${rect.width}px`;
      indicator.style.height = `${rect.height}px`;
      indicator.style.transform = `translate(${rect.left - box.left}px, ${rect.top - box.top}px)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey, target]);

  return { containerRef, indicatorRef };
}
