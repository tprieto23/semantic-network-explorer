import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPopup } from "./useAnchoredPopup";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Texto secundario a la derecha (conteo, descripción corta). */
  hint?: string;
}

export interface SelectGroup<T extends string> {
  group: string;
  options: SelectOption<T>[];
}

interface GlassSelectProps<T extends string> {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: (SelectOption<T> | SelectGroup<T>)[];
}

/**
 * Select con desplegable de vidrio. La lista nativa del navegador no se puede estilizar,
 * así que sigue el patrón «combobox de solo selección» de ARIA: el foco se queda en el
 * botón y aria-activedescendant marca la opción activa.
 */
export function GlassSelect<T extends string>({ id, value, onChange, options }: GlassSelectProps<T>) {
  const listId = useId();
  const popup = useAnchoredPopup<HTMLButtonElement, HTMLUListElement>();
  const { triggerRef, popupRef: listRef, open, setOpen } = popup;
  const typed = useRef({ text: "", at: 0 });
  const [active, setActive] = useState(-1);

  const flat = useMemo(
    () => options.flatMap((item) => ("group" in item ? item.options : [item])),
    [options],
  );
  const selectedIndex = flat.findIndex((option) => option.value === value);
  const selected = flat[selectedIndex];
  const optionId = (index: number) => `${listId}-${index}`;

  function show() {
    setActive(Math.max(selectedIndex, 0));
    popup.show();
  }

  function choose(index: number) {
    const option = flat[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  }

  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[id="${optionId(active)}"]`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  /** Salta a la siguiente opción que empieza con lo que se va tecleando. */
  function typeAhead(key: string) {
    const now = Date.now();
    typed.current.text = now - typed.current.at > 700 ? key : typed.current.text + key;
    typed.current.at = now;
    const text = typed.current.text.toLowerCase();
    const start = open ? active : selectedIndex;
    const order = flat.map((_, offset) => (start + 1 + offset) % flat.length);
    const match = order.find((index) => flat[index].label.toLowerCase().startsWith(text));
    if (match === undefined) return;
    if (open) setActive(match);
    else onChange(flat[match].value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = flat.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      } else if (event.key.length === 1) {
        typeAhead(event.key);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
        break;
      case "Home":
      case "PageUp":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
      case "PageDown":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Tab":
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        if (event.key.length === 1) typeAhead(event.key);
    }
  }

  let index = -1;
  const renderOption = (option: SelectOption<T>) => {
    index += 1;
    const current = index;
    return (
      <li
        key={option.value}
        id={optionId(current)}
        role="option"
        aria-selected={option.value === value}
        className={`gsel-option${current === active ? " active" : ""}`}
        onPointerMove={() => setActive(current)}
        onClick={() => choose(current)}
      >
        <span className="gsel-check" aria-hidden="true">
          {option.value === value && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2.5 6.3 5 8.7l4.5-5.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="gsel-label">{option.label}</span>
        {option.hint && <span className="gsel-hint">{option.hint}</span>}
      </li>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className="select gsel-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!listRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
        }}
      >
        <span className="gsel-value">
          {selected?.label ?? value}
          {selected?.hint && <span className="gsel-hint"> · {selected.hint}</span>}
        </span>
        <svg className="gsel-caret" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        popup.style &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            tabIndex={-1}
            className="gsel-list glass"
            style={popup.style}
            // El foco no sale del botón al hacer clic en la lista.
            onPointerDown={(event) => event.preventDefault()}
          >
            {options.map((item) =>
              "group" in item ? (
                <li key={`group-${item.group}`} role="presentation">
                  <div className="gsel-group" role="presentation">
                    {item.group}
                  </div>
                  <ul role="group" aria-label={item.group}>
                    {item.options.map(renderOption)}
                  </ul>
                </li>
              ) : (
                renderOption(item)
              ),
            )}
          </ul>,
          document.body,
        )}
    </>
  );
}
