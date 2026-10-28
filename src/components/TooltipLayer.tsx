import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_ID = "glass-tooltip";
/** Espera antes de mostrar con el mouse, para no encender tooltips al pasar de largo. */
const HOVER_DELAY = 350;
const GAP = 8;

interface Tip {
  text: string;
  /** Primera línea en negrita (data-tip-title), opcional. */
  title?: string;
  target: HTMLElement;
}

/**
 * Tooltips de vidrio para toda la app: cualquier elemento con `data-tip` muestra ese texto
 * al pasar el cursor o al recibir el foco. Reemplaza al `title` nativo, que no se puede
 * estilizar. Va en un portal con posición fija, así el scroll de los paneles no lo recorta.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [style, setStyle] = useState<{ left: number; top: number; placement: "below" | "above" }>();
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const find = (node: EventTarget | null) =>
      node instanceof Element ? node.closest<HTMLElement>("[data-tip]") : null;

    const open = (target: HTMLElement, delay: number) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const text = target.dataset.tip;
        if (text) setTip({ text, title: target.dataset.tipTitle, target });
      }, delay);
    };
    const close = () => {
      window.clearTimeout(timer.current);
      setTip(null);
    };

    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = find(event.target);
      if (target) open(target, HOVER_DELAY);
    };
    const out = (event: PointerEvent) => {
      const target = find(event.target);
      if (target && !target.contains(event.relatedTarget as Node | null)) close();
    };
    // Con teclado se muestra al instante: el foco ya es una intención clara.
    const focusIn = (event: FocusEvent) => {
      const target = find(event.target);
      if (target && (event.target as Element).matches(":focus-visible")) open(target, 0);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", close);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", keyDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", close);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  // Los lectores de pantalla leen el tooltip como descripción del elemento enfocado.
  useEffect(() => {
    if (!tip) return;
    const { target } = tip;
    const previous = target.getAttribute("aria-describedby");
    target.setAttribute("aria-describedby", previous ? `${previous} ${TOOLTIP_ID}` : TOOLTIP_ID);
    return () => {
      if (previous) target.setAttribute("aria-describedby", previous);
      else target.removeAttribute("aria-describedby");
    };
  }, [tip]);

  // Se coloca debajo del elemento, alineado a su borde izquierdo y dentro de la ventana;
  // arriba si no cabe.
  useEffect(() => {
    if (!tip || !popRef.current) return;
    const rect = tip.target.getBoundingClientRect();
    const pop = popRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - pop.width - 8);
    const below = rect.bottom + GAP + pop.height <= window.innerHeight - 8;
    setStyle({ left, top: below ? rect.bottom + GAP : rect.top - GAP - pop.height, placement: below ? "below" : "above" });
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div
      ref={popRef}
      id={TOOLTIP_ID}
      role="tooltip"
      className={`glass-tooltip glass${style ? ` ${style.placement}` : ""}`}
      style={style ? { left: style.left, top: style.top } : { left: -9999, top: 0 }}
    >
      {tip.title && <strong>{tip.title}</strong>}
      {tip.text}
    </div>,
    document.body,
  );
}
