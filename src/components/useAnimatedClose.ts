import { useCallback, useState } from "react";

/** Lo que dura la animación de salida de modales y hojas (en index.css, «-out»). */
const EXIT_MS = 180;

/**
 * Cierre con animación de salida: marca `closing` (la clase dispara la animación) y llama
 * a onClose cuando termina. Con «reducir movimiento» cierra al instante.
 */
export function useAnimatedClose(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);
  return { closing, close };
}
