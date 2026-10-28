import { PRESETS, isPresetActive, presetFilters } from "../domain/presets";
import { useT } from "../i18n";
import { DEFAULT_FILTERS, useFilterStore } from "../state/filters";

/**
 * Vistas guiadas como islitas de vidrio sobre el grafo: un toque aplica la vista y otro
 * la quita. Cada una explica qué muestra en su tooltip.
 */
export function GuidedViews() {
  const { t } = useT();
  const filters = useFilterStore((state) => state.filters);
  const replace = useFilterStore((state) => state.replace);
  return (
    <div className="islands" role="group" aria-label={t("preset.title")}>
      {PRESETS.map((preset) => {
        const isActive = isPresetActive(preset, filters);
        return (
          <button
            key={preset.id}
            type="button"
            className="glass-btn island"
            aria-pressed={isActive}
            data-tip={t(preset.description)}
            onClick={() =>
              replace(isActive ? { ...DEFAULT_FILTERS, sector: filters.sector } : presetFilters(preset, filters))
            }
          >
            {t(preset.label)}
          </button>
        );
      })}
    </div>
  );
}
