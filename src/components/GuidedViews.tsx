import { useState } from "react";
import { PRESETS, isPresetActive, presetFilters } from "../domain/presets";
import { useT } from "../i18n";
import { DEFAULT_FILTERS, useFilterStore } from "../state/filters";
import { ChevronIcon } from "./icons";

const COLLAPSED_KEY = "rs-guided-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Botones de las vistas: un toque aplica la vista y otro la quita. */
export function PresetList({ onPick }: { onPick?: () => void }) {
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
 * Vistas guiadas en un bloque de vidrio sobre el grafo (abajo a la izquierda): cada vista
 * es un botón con una línea que dice qué muestra; un toque la aplica y otro la quita.
 * Se puede minimizar para ver la red completa. Solo aparece con el panel Explora abierto,
 * porque las vistas son atajos de sus filtros; en celular van dentro del panel.
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
