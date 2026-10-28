import { useEffect, useRef, useState } from "react";
import { PRESETS, isPresetActive, presetFilters } from "../domain/presets";
import { useT } from "../i18n";
import { DEFAULT_FILTERS, useFilterStore } from "../state/filters";
import { ChevronIcon, SparkIcon } from "./icons";

const COLLAPSED_KEY = "rs-guided-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Botones de las vistas: un toque aplica la vista y otro la quita. */
function PresetList({ onPick }: { onPick?: () => void }) {
  const { t } = useT();
  const filters = useFilterStore((state) => state.filters);
  const replace = useFilterStore((state) => state.replace);
  return (
    <div className="guided-list" role="group" aria-label={t("preset.title")}>
      {PRESETS.map((preset) => {
        const isActive = isPresetActive(preset, filters);
        return (
          <button
            key={preset.id}
            type="button"
            className="guided-item"
            aria-pressed={isActive}
            data-tip={t(preset.description)}
            onClick={() => {
              replace(isActive ? { ...DEFAULT_FILTERS, sector: filters.sector } : presetFilters(preset, filters));
              onPick?.();
            }}
          >
            <strong>{t(preset.label)}</strong>
            <span>{t(preset.hint)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Celular: botón «Vistas» junto a «Explora» que despliega la lista debajo y se cierra al
 * elegir. Muestra el nombre de la vista activa, si hay una.
 */
export function GuidedViewsButton() {
  const { t } = useT();
  const filters = useFilterStore((state) => state.filters);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = PRESETS.find((preset) => isPresetActive(preset, filters));

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="guided-mobile" ref={ref}>
      <button
        type="button"
        className={`glass-btn${active ? " has-active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <SparkIcon />
        {active ? t(active.label) : t("preset.button")}
      </button>
      {open && (
        <div className="guided-pop glass">
          <PresetList onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/**
 * Vistas guiadas en un bloque de vidrio sobre el grafo (abajo a la izquierda): cada vista
 * es un botón con una línea que dice qué muestra; un toque la aplica y otro la quita.
 * Se puede minimizar para ver la red completa. En celular se usa GuidedViewsButton.
 */
export function GuidedViews() {
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Sin almacenamiento solo se pierde la preferencia al recargar.
    }
  }

  return (
    <section className={`guided glass${collapsed ? " collapsed" : ""}`} aria-label={t("preset.title")}>
      <button type="button" className="guided-head" aria-expanded={!collapsed} onClick={toggle}>
        <span>{t("preset.title")}</span>
        <ChevronIcon direction={collapsed ? "right" : "left"} />
      </button>
      {!collapsed && <PresetList />}
    </section>
  );
}
